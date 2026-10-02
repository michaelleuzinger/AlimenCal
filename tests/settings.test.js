'use strict';
/*
 * Tests für verbindliche Einstellungen (Two-Party-Lock), Override-Modus
 * und Read-Only-Imports.
 * Ausführung: node tests/settings.test.js
 *
 * Prüft:
 *  - Base-Wert editierbar vor, read-only nach beidseitiger Bestätigung
 *  - Rebase erzeugt neue Version und öffnet den Lock erneut
 *  - Overrides verändern den Base-Wert nie (auch bei gelockter Einstellung)
 *  - resolve/resolveWithContext liefern Base und effektiven Wert (Delta)
 *  - Rollen: viewer/editor/approver mit korrekten Rechten
 *  - Imports: Vorschau read-only, Commit friert ein, Supersede-Kette
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var passed = 0;

function ok(name, cond) {
  if (!cond) {
    console.error('FAIL: ' + name);
    process.exitCode = 1;
  } else {
    passed++;
    console.log('ok  ' + name);
  }
}

function loadSettings() {
  var code = fs.readFileSync(path.join(ROOT, 'js/settings.js'), 'utf8');
  var ctx = {};
  new Function('AlimenCal', code)(ctx);
  return ctx.settings;
}

function isSettingError(err) {
  return err && err.isSettingError === true;
}

var mod = loadSettings();
var SettingsService = mod.SettingsService;

/* ---- Two-Party-Lock ------------------------------------------------------- */

var svc = new SettingsService();
var sid = svc.registerSetting('nutrition', 'energy_per_100g', 350, 'kcal');

ok('Base-Wert vor Lock änderbar', (function () {
  svc.updateBaseValue(sid, 360, 'A');
  return svc.resolve(sid) === 360;
})());

ok('einseitige Bestätigung lockt noch nicht', svc.confirmBinding(sid, 'A') === false);
ok('beidseitige Bestätigung lockt', svc.confirmBinding(sid, 'B') === true);
ok('gelockter Wert bleibt erhalten', svc.resolve(sid) === 360);

ok('Update nach Lock wird verweigert', (function () {
  try { svc.updateBaseValue(sid, 999, 'A'); return false; }
  catch (e) { return isSettingError(e); }
})());

ok('Editor darf Base-Wert nicht ändern', (function () {
  var s = new SettingsService();
  var id = s.registerSetting('x', 'k', 1);
  try { s.updateBaseValue(id, 2, 'A', 'EDITOR'); return false; }
  catch (e) { return isSettingError(e); }
})());

ok('Rebase erzeugt neue Version und öffnet Lock', (function () {
  var v = svc.rebaseSetting(sid, 380, 'A');
  return v === 2 && svc.resolve(sid) === 380 && !svc.settings[sid].lockedA;
})());

ok('Audit-Log erfasst update und confirm_lock', (function () {
  var log = svc.settings[sid].audit;
  return log.some(function (e) { return e.action === 'update'; }) &&
         log.some(function (e) { return e.action === 'confirm_lock'; });
})());

/* ---- Override-Modus -------------------------------------------------------- */

var osvc = new SettingsService();
var osid = osvc.registerSetting('nutrition', 'protein_per_100g', 12.5, 'g');
osvc.confirmBinding(osid, 'A');
osvc.confirmBinding(osid, 'B');

ok('Override auf gelockter Einstellung erlaubt', (function () {
  var id = osvc.createOverride(osid, 'scenario_hypo', 20, { party: 'A', reason: 'Test' });
  return typeof id === 'string';
})());

ok('Override ändert Base-Wert nicht', osvc.resolve(osid) === 12.5);
ok('resolve mit Szenario liefert Override', osvc.resolve(osid, 'scenario_hypo') === 20);

ok('resolveWithContext zeigt Original und Delta', (function () {
  var ctx = osvc.resolveWithContext(osid, 'scenario_hypo');
  return ctx.baseValue === 12.5 && ctx.effectiveValue === 20 &&
         ctx.overridden === true && ctx.isLocked === true;
})());

ok('Override löschen stellt Original wieder her', (function () {
  var id = osvc.createOverride(osid, 'scenario_del', 30);
  osvc.deleteOverride(id);
  return osvc.resolve(osid, 'scenario_del') === 12.5;
})());

ok('Viewer darf keinen Override anlegen', (function () {
  try { osvc.createOverride(osid, 'scenario_v', 40, {}, 'VIEWER'); return false; }
  catch (e) { return isSettingError(e); }
})());

ok('Erneutes createOverride aktualisiert bestehenden Eintrag', (function () {
  osvc.createOverride(osid, 'scenario_up', 20);
  osvc.createOverride(osid, 'scenario_up', 25);
  return osvc.resolve(osid, 'scenario_up') === 25 && osvc.resolve(osid) === 12.5;
})());

/* ---- Read-Only-Imports ------------------------------------------------------ */

var isvc = new SettingsService();
var payload = { rows: [{ name: 'Apfel', kcal: 52 }] };

ok('Vorschau ist pending und unverändert', (function () {
  var snap = isvc.previewImport('csv', payload);
  return snap.status === 'pending' && snap.importedAt === null &&
         typeof snap.checksum === 'string';
})());

ok('Vorschau-Prüfsumme ist deterministisch', (function () {
  var a = isvc.previewImport('csv', payload);
  var b = isvc.previewImport('csv', payload);
  return a.checksum === b.checksum;
})());

ok('Commit friert Snapshot ein', (function () {
  var snap = isvc.previewImport('csv', payload);
  var committed = isvc.commitImport(snap);
  return committed.status === 'committed';
})());

ok('Doppel-Commit wird verweigert', (function () {
  var snap = isvc.previewImport('csv', payload);
  isvc.commitImport(snap);
  try { isvc.commitImport(snap); return false; }
  catch (e) { return isSettingError(e); }
})());

ok('Supersede erzeugt neue Version, Original bleibt', (function () {
  var snap = isvc.previewImport('csv', payload);
  var c = isvc.commitImport(snap);
  var next = isvc.supersedeImport(c, { rows: [] });
  return next.version === 2 && next.supersedes === c.id &&
         isvc.getSnapshot(c.id).status === 'committed';
})());

ok('Editor darf Import nicht committen', (function () {
  var snap = isvc.previewImport('csv', payload);
  try { isvc.commitImport(snap, 'EDITOR'); return false; }
  catch (e) { return isSettingError(e); }
})());

console.log('\n' + passed + ' Tests bestanden');
