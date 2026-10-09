'use strict';
/*
 * Unit-Tests fuer das Vermoegensausgleich-Modul (vereinfachter
 * Stichtags-Modus). Ausfuehrung: node tests/assetsplit.test.js
 */
var as = require('../js/assetsplit.js');
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

function close(a, b, eps) {
  return Math.abs(a - b) <= (eps || 0.01);
}

/* ---------- Normalisierung ---------- */
ok('Kategorien definiert (7)', as.CATEGORIES.length === 7);
ok('Owner definiert (A, B, joint)', JSON.stringify(as.OWNERS) === '["A","B","joint"]');

var valid = as.normalizeAsset({ label: 'Konto A', category: 'account', owner: 'A', value: 1200 });
ok('normalizeAsset: gueltiger Eintrag', valid !== null && valid.label === 'Konto A');
ok('normalizeAsset: value = 1200', valid.value === 1200);
ok('normalizeAsset: unbekannte Kategorie => other', as.normalizeAsset({ label: 'X', category: 'hack', value: 1 }).category === 'other');
ok('normalizeAsset: unbekannter Owner => A', as.normalizeAsset({ label: 'X', owner: 'C', value: 1 }).owner === 'A');
ok('normalizeAsset: fehlender shareA => 0.5', as.normalizeAsset({ label: 'X', value: 1 }).shareA === 0.5);
ok('normalizeAsset: shareA > 1 => 0.5', as.normalizeAsset({ label: 'X', value: 1, shareA: 2 }).shareA === 0.5);
ok('normalizeAsset: leerer Betrag => null', as.normalizeAsset({ label: 'X', value: '' }) === null);
ok('normalizeAsset: NaN-Betrag => null', as.normalizeAsset({ label: 'X', value: 'abc' }) === null);
ok('normalizeAsset: leerer Name => null', as.normalizeAsset({ label: '  ', value: 5 }) === null);
ok('normalizeAsset: null => null', as.normalizeAsset(null) === null);
ok('normalizeAsset: numerischer String ok', as.normalizeAsset({ label: 'X', value: '99.5' }).value === 99.5);

/* ---------- computeSplit ---------- */
var split = as.computeSplit([
  { label: 'Konto A', owner: 'A', value: 10000 },
  { label: 'Depot B', owner: 'B', value: 6000 }
]);
ok('Split: sumA = 10000', close(split.sumA, 10000));
ok('Split: sumB = 6000', close(split.sumB, 6000));
ok('Split: total = 16000', close(split.total, 16000));
ok('Split: half = 8000', close(split.half, 8000));
ok('Split: amount = 2000', close(split.amount, 2000));
ok('Split: from = A', split.from === 'A');
ok('Split: to = B', split.to === 'B');

var splitB = as.computeSplit([
  { label: 'Konto A', owner: 'A', value: 1000 },
  { label: 'Depot B', owner: 'B', value: 5000 }
]);
ok('Split umgekehrt: amount = 2000', close(splitB.amount, 2000));
ok('Split umgekehrt: from = B', splitB.from === 'B');
ok('Split umgekehrt: to = A', splitB.to === 'A');

var balanced = as.computeSplit([
  { label: 'Konto A', owner: 'A', value: 4000 },
  { label: 'Konto B', owner: 'B', value: 4000 }
]);
ok('Ausgeglichen: amount = 0', balanced.amount === 0);
ok('Ausgeglichen: from/to = null', balanced.from === null && balanced.to === null);

/* Gemeinsames Vermoegen: Aufteilung nach shareA */
var joint = as.computeSplit([
  { label: 'Haus', owner: 'joint', value: 100000, shareA: 0.6 }
]);
ok('Joint: sumA = 60000', close(joint.sumA, 60000));
ok('Joint: sumB = 40000', close(joint.sumB, 40000));
ok('Joint: amount = 10000', close(joint.amount, 10000));

/* Schulden (negative Werte) */
var debts = as.computeSplit([
  { label: 'Konto A', owner: 'A', value: 3000 },
  { label: 'Kredit B', owner: 'B', value: -7000 }
]);
ok('Schulden: sumB = -7000', close(debts.sumB, -7000));
ok('Schulden: total = -4000', close(debts.total, -4000));
ok('Schulden: from = A, to = B', debts.from === 'A' && debts.to === 'B');

/* Leere / ungueltige Eingaben */
var empty = as.computeSplit([]);
ok('Leer: alles 0, kein Ausgleich', empty.amount === 0 && empty.total === 0 && empty.from === null);
var invalidOnly = as.computeSplit([{ label: '', value: 5 }, { label: 'X', value: 'abc' }, null]);
ok('Nur ungueltige Eintraege: wie leer', invalidOnly.amount === 0 && invalidOnly.from === null);
ok('computeSplit: kein Array vertraegt sich', as.computeSplit(null).amount === 0);

/* Rundung auf 2 Dezimalen */
var rounded = as.computeSplit([
  { label: 'A', owner: 'A', value: 100.005 },
  { label: 'B', owner: 'B', value: 0 }
]);
ok('Rundung: sumA = 100.01 (round2)', close(rounded.sumA, 100.01, 0.011));

/* ---------- sumsByCategory ---------- */
var sums = as.sumsByCategory([
  { label: 'Konto A', category: 'account', owner: 'A', value: 1000 },
  { label: 'ETF B', category: 'etf', owner: 'B', value: 500 },
  { label: 'Haus', category: 'realestate', owner: 'joint', value: 200, shareA: 0.25 }
]);
ok('Kategorien-Summen: account A = 1000', close(sums.account.A, 1000));
ok('Kategorien-Summen: etf B = 500', close(sums.etf.B, 500));
ok('Kategorien-Summen: joint realestate A = 50', close(sums.realestate.A, 50));
ok('Kategorien-Summen: joint realestate B = 150', close(sums.realestate.B, 150));
ok('Kategorien-Summen: alle 7 Kategorien', Object.keys(sums).length === 7);

/* ---------- Zusammenfassung ---------- */
console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
