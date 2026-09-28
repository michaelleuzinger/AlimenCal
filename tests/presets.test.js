'use strict';
/*
 * Tests für die kantonalen Presets.
 * Ausführung: node tests/presets.test.js
 *
 * Prüft:
 *  - JSON-Dateien unter presets/ sind gültiges JSON und vollständig
 *  - js/presets.js (eingebettete Kopie für file://-Nutzung) ist mit den
 *    JSON-Dateien konsistent
 *  - Pflichtfelder sind vorhanden
 *  - Das Zürich-Preset entspricht den App-Defaults (js/config.js)
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PRESET_DIR = path.join(ROOT, 'presets');

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

/* js/presets.js laden (Browser-Script ohne module.exports: im Kontext auswerten) */
function loadScript(relPath, context) {
  var code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  new Function('AlimenCal', code)(context);
  return context;
}

var ctx = loadScript('js/presets.js', {});
var embedded = ctx.presets;

/* js/config.js laden für Default-Vergleich */
var config = loadScript('js/config.js', {}).config;

var files = fs.readdirSync(PRESET_DIR).filter(function (f) {
  return f.slice(-5) === '.json';
});
ok('Mindestens zwei Preset-Dateien vorhanden', files.length >= 2);

var jsonPresets = {};
files.forEach(function (file) {
  var raw = fs.readFileSync(path.join(PRESET_DIR, file), 'utf8');
  var data;
  try {
    data = JSON.parse(raw);
    ok('JSON gültig: ' + file, true);
  } catch (e) {
    ok('JSON gültig: ' + file, false);
    return;
  }
  jsonPresets[data.meta.id] = data;

  ok('Pflichtfelder meta.id: ' + file, typeof data.meta.id === 'string' && data.meta.id.length > 0);
  ok('Pflichtfelder meta.name: ' + file, typeof data.meta.name === 'string' && data.meta.name.length > 0);
  ok('Pflichtfelder meta.canton: ' + file, typeof data.meta.canton === 'string' && data.meta.canton.length === 2);
  ok('Pflichtfelder meta.source: ' + file, typeof data.meta.source === 'string' && data.meta.source.length > 0);
  ok('Pflichtfelder meta.verification-Checkliste: ' + file,
    Array.isArray(data.meta.verification) && data.meta.verification.length > 0);

  ok('childNeedTable vorhanden und nicht leer: ' + file,
    Array.isArray(data.childNeedTable) && data.childNeedTable.length > 0);
  ok('Existenzminima vorhanden: ' + file,
    isFinite(data.defaultExistenzminimumEmployed) && isFinite(data.defaultExistenzminimumNotEmployed));
});

/* Konsistenz eingebettet <-> JSON */
ok('Anzahl Presets identisch (JS vs. JSON)', embedded.length === Object.keys(jsonPresets).length);

embedded.forEach(function (p) {
  var json = jsonPresets[p.meta.id];
  ok('Preset in JSON vorhanden: ' + p.meta.id, !!json);
  if (!json) { return; }
  ok('Eingebettetes Preset konsistent mit JSON: ' + p.meta.id,
    JSON.stringify(stripFunctions(p)) === JSON.stringify(stripFunctions(json)));
});

/* Zürich-Preset entspricht den App-Defaults */
var zh = jsonPresets['zuerich-2025'];
ok('Zürich-Preset existiert', !!zh);
if (zh) {
  ok('Zürich-Preset: Existenzminima = App-Default',
    zh.defaultExistenzminimumEmployed === config.defaultExistenzminimumEmployed &&
    zh.defaultExistenzminimumNotEmployed === config.defaultExistenzminimumNotEmployed);
  ok('Zürich-Preset: childNeedTable = App-Default',
    JSON.stringify(zh.childNeedTable) === JSON.stringify(config.childNeedTable));
  ok('Zürich-Preset: fallbackChildBasicNeed = App-Default',
    zh.fallbackChildBasicNeed === config.fallbackChildBasicNeed);
}

/* Schaffhausen-Preset trägt Verifikations-Warnung */
var sh = jsonPresets['schaffhausen-offen'];
ok('Schaffhausen-Preset existiert', !!sh);
if (sh) {
  var disclaimerPresent = sh.meta.notes.some(function (n) {
    return /NICHT.*verifiziert|nicht verifiziert/i.test(n);
  });
  ok('Schaffhausen-Preset: Verifikations-Disclaimer in notes', disclaimerPresent);
  ok('Schaffhausen-Preset: Checkliste mit KESB-Kontakt',
    sh.meta.verification.some(function (v) { return /KESB Schaffhausen/.test(v); }));
}

function stripFunctions(obj) {
  return JSON.parse(JSON.stringify(obj));
}

console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
