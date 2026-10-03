'use strict';
/*
 * Unit-Tests für das AlimenCal-Theme-Modul.
 * Ausführung: node tests/themes.test.js
 */
var themes = require('../js/themes.js');
var assert = require('assert');

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

/* ---------- Presets ---------- */
ok('Mindestens 4 Presets vorhanden', themes.PRESETS.length >= 4);
ok('Preset-IDs eindeutig',
  new Set(themes.PRESETS.map(function (p) { return p.id; })).size === themes.PRESETS.length);
ok('Classic-Preset ist zuerst (App-Default)', themes.PRESETS[0].id === 'classic');

themes.PRESETS.forEach(function (preset) {
  ok('Preset ' + preset.id + ': Name vorhanden', typeof preset.name === 'string' && preset.name.length > 0);
  themes.TOKENS.forEach(function (token) {
    ok('Preset ' + preset.id + ': Token ' + token.key + ' gesetzt',
      preset.values[token.key] != null);
  });
});

/* ---------- Tokens ---------- */
ok('TOKEN_TO_CSS deckt alle Tokens ab',
  themes.TOKENS.every(function (token) { return themes.TOKEN_TO_CSS[token.key]; }));
ok('cssToToken invers zu TOKEN_TO_CSS',
  themes.cssToToken('--bg') === 'bg' && themes.cssToToken('--accent-dark') === 'accentDark');
ok('cssToToken: unbekannte Variable => null', themes.cssToToken('--nope') === null);
ok('Genau ein Zahl-Token (radius)',
  themes.TOKENS.filter(function (t) { return t.type === 'number'; }).length === 1);

/* ---------- Validierung ---------- */
ok('isValidColor: #abc', themes.isValidColor('#abc') === true);
ok('isValidColor: #aabbcc', themes.isValidColor('#aabbcc') === true);
ok('isValidColor: #AABBCC (Grossbuchstaben)', themes.isValidColor('#AABBCC') === true);
ok('isValidColor: ohne #', themes.isValidColor('aabbcc') === false);
ok('isValidColor: zu lang', themes.isValidColor('#aabbccd') === false);
ok('isValidColor: leer', themes.isValidColor('') === false);
ok('isValidRadius: 10', themes.isValidRadius(10) === true);
ok('isValidRadius: 0', themes.isValidRadius(0) === true);
ok('isValidRadius: -1', themes.isValidRadius(-1) === false);
ok('isValidRadius: 41', themes.isValidRadius(41) === false);

/* ---------- sanitizeValues ---------- */
var base = themes.PRESETS[0];
var sanitized = themes.sanitizeValues({ bg: '#123456', radius: 20 });
ok('sanitizeValues: gueltiger Wert uebernommen', sanitized.bg === '#123456');
ok('sanitizeValues: radius uebernommen', sanitized.radius === 20);
ok('sanitizeValues: fehlende Token aus Basis ergaenzt', sanitized.card === base.values.card);
ok('sanitizeValues: ungueltige Farbe verworfen',
  themes.sanitizeValues({ bg: 'grün' }).bg === base.values.bg);
ok('sanitizeValues: ungueltiger Radius verworfen',
  themes.sanitizeValues({ radius: 99 }).radius === base.values.radius);
ok('sanitizeValues: unknown keys fliessen nicht ein',
  Object.keys(themes.sanitizeValues({ hacking: 1 })).indexOf('hacking') < 0);
ok('sanitizeValues: trimmt Farbwerte', themes.sanitizeValues({ bg: ' #123456 ' }).bg === '#123456');

/* ---------- isCustomized ---------- */
ok('isCustomized: Basis-Theme ist nicht customisiert', themes.isCustomized(base.values) === false);
ok('isCustomized: geaenderter Wert erkannt',
  themes.isCustomized(themes.sanitizeValues({ bg: '#123456' })) === true);
ok('isCustomized: dark-Preset ist customisiert (gegenueber classic)',
  themes.isCustomized(themes.PRESETS[1].values) === true);

/* ---------- Design-Stile ---------- */
ok('DESIGNS vorhanden und nicht leer',
  Array.isArray(themes.DESIGNS) && themes.DESIGNS.length >= 2);
ok('DESIGNS: base als Standard enthalten', themes.DESIGNS.indexOf('base') !== -1);
themes.PRESETS.forEach(function (preset) {
  if (preset.design != null) {
    ok('Preset ' + preset.id + ': gueltiger design-Stil',
      themes.DESIGNS.indexOf(preset.design) !== -1);
  }
});
var applePreset = themes.PRESETS.filter(function (p) { return p.id === 'calm'; })[0];
ok('Calm-Preset vorhanden (neuer Standard)', !!applePreset);
ok('designOfPreset: Calm erkannt', themes.designOfPreset(applePreset) === 'calm');
ok('Calm-Dark-Preset vorhanden und Stil erkannt', (function () {
  var p = themes.PRESETS.filter(function (q) { return q.id === 'calm-dark'; })[0];
  return !!p && themes.designOfPreset(p) === 'calm-dark';
})());
ok('Editorial-Preset vorhanden und Stil erkannt', (function () {
  var p = themes.PRESETS.filter(function (q) { return q.id === 'editorial'; })[0];
  return !!p && themes.designOfPreset(p) === 'editorial';
})());
ok('Alte Design-Stile entfernt (apple, material, minimal, bento, dark-premium, command-center)',
  !themes.DESIGNS.some(function (d) {
    return ['apple','material','minimal','bento','dark-premium','command-center'].indexOf(d) !== -1;
  }));
ok('designOfPreset: ohne design => base', themes.designOfPreset({ id: 'x' }) === 'base');
ok('designOfPreset: null => base', themes.designOfPreset(null) === 'base');
var designIds = ['calm','calm-dark','neubrutalism'];
designIds.forEach(function (id) {
  ok('Design-Preset ' + id + ' vorhanden',
    themes.PRESETS.some(function (p) { return p.id === id && p.design; }));
});
/* ---------- Anwendung (DOM-frei) ---------- */
ok('applyToDocument ohne DOM wirft nicht', themes.applyToDocument(base.values) === undefined);

/* ---------- Zusammenfassung ---------- */
console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
