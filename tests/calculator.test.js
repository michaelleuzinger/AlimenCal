'use strict';
/*
 * Unit-Tests für den AlimenCal-Berechnungskern.
 * Ausführung: node tests/calculator.test.js
 */

var calc = require('../js/calculator.js');
var assert = require('assert');

var CFG = {
  defaultExistenzminimumEmployed: 2200,
  defaultExistenzminimumNotEmployed: 2000,
  childNeedTable: [
    { fromAge: 0, toAge: 6, basicNeed: 500, careSupport: 1100 },
    { fromAge: 7, toAge: 12, basicNeed: 640, careSupport: 900 },
    { fromAge: 13, toAge: 17, basicNeed: 720, careSupport: 700 },
    { fromAge: 18, toAge: 99, basicNeed: 900, careSupport: 0 }
  ],
  careSupportMaxAge: 17,
  fallbackChildBasicNeed: 600,
  defaultSpousalStandard: 4000
};

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

/* ---------- Hilfsfunktionen ---------- */

ok('round2 rundet kaufmännisch', calc.round2(2.675) === 2.68 || calc.round2(2.675) === 2.67);
ok('clamp begrenzt', calc.clamp(5, 0, 1) === 1 && calc.clamp(-1, 0, 1) === 0);

var shares = calc.normalizeCareShares({ careShareParentA: 0.6, careShareParentB: 0.4 });
ok('Betreuungsanteile werden normalisiert (60/40)', close(shares.a, 0.6) && close(shares.b, 0.4));

var sharesEmpty = calc.normalizeCareShares({ careShareParentA: 0, careShareParentB: 0 });
ok('Leere Betreuungsanteile => 50/50', close(sharesEmpty.a, 0.5));

var sharesSum2 = calc.normalizeCareShares({ careShareParentA: 80, careShareParentB: 80 });
ok('Summe >100% wird skaliert', close(sharesSum2.a, 0.5) && close(sharesSum2.b, 0.5));

ok('Grundbedarf Kind 8 Jahre = 640', calc.childBasicNeed({ age: 8 }, CFG) === 640);
ok('Grundbedarf Kind 3 Jahre = 500', calc.childBasicNeed({ age: 3 }, CFG) === 500);
ok('Grundbedarf Kind 17 Jahre = 720', calc.childBasicNeed({ age: 17 }, CFG) === 720);
ok('Grundbedarf Kind 18 Jahre = 900', calc.childBasicNeed({ age: 18 }, CFG) === 900);
ok('Betreuungsunterhalt-Richtwert Kind 8 = 900',
  calc.childCareSupportRichtwert({ age: 8 }, CFG) === 900);
ok('Betreuungsunterhalt ab 18 = 0', calc.childCareSupportRichtwert({ age: 19 }, CFG) === 0);

/* ---------- Standardfall Kindesunterhalt ---------- */

/*
 * Elternteil A: Einkommen 6000, Existenzminimum 2200 -> verfügbar 3800
 * Elternteil B: Einkommen 3000, Existenzminimum 2200 -> verfügbar 800
 * Kind 8 Jahre, 100% Betreuung bei B, keine direkten Kosten, keine Zulage.
 *
 * Grundbedarf 640; Aufteilung nach verfügbarem Einkommen:
 *   Anteil A = 3800/4600 = 0.826..., Anteil B = 800/4600
 * Barunterhalt A ~ 528.70, B ~ 111.30
 * Betreuungsunterhalt: Richtwert 900, B betreut 100% => A zahlt netto 900 an B.
 */

var inputStd = {
  parents: {
    a: { income: 6000, existenzminimum: 2200, employed: true },
    b: { income: 3000, existenzminimum: 2200, employed: true }
  },
  children: [
    { age: 8, ownIncome: 0, childAllowance: 0, kkPremium: 0, externalCareCosts: 0,
      careShareParentA: 0, careShareParentB: 100 }
  ]
};

var resStd = calc.calculateChildSupport(inputStd, CFG);
var childStd = resStd.perChild[0];

ok('Standardfall: Barunterhalt total = 640', close(childStd.barTotal, 640));
ok('Standardfall: barFromA + barFromB = barTotal',
  close(childStd.barFromA + childStd.barFromB, 640));
ok('Standardfall: Anteil A > Anteil B (Leistungsfähigkeit)',
  childStd.barFromA > childStd.barFromB);
ok('Standardfall: Betreuungsunterhalt A->B = 900',
  close(childStd.careNetFromAToB, 900));
ok('Standardfall: Total A = Bar A + Betreuung A',
  close(childStd.totalFromA, childStd.barFromA + 900));
ok('Standardfall: keine Mangellage', !resStd.mangellage);
ok('Standardfall: Total A ~ 1428.70', close(childStd.totalFromA, 640 * (3800 / 4600) + 900, 0.05));

/* ---------- Kindeseinkommen und direkte Kosten ---------- */

var inputCosts = {
  parents: {
    a: { income: 10000, existenzminimum: 2200, employed: true },
    b: { income: 8000, existenzminimum: 2200, employed: true }
  },
  children: [
    { age: 4, ownIncome: 0, childAllowance: 250, kkPremium: 150, externalCareCosts: 400,
      careShareParentA: 50, careShareParentB: 50 }
  ]
};

var resCosts = calc.calculateChildSupport(inputCosts, CFG);
var childCosts = resCosts.perChild[0];

// Grundbedarf 500 + direkte Kosten 550 - Zulage 250 = 800
ok('Direkte Kosten: Grundbedarf = 500', close(childCosts.basicNeed, 500));
ok('Direkte Kosten: direkte Kosten = 550', close(childCosts.directCosts, 550));
ok('Direkte Kosten: Barunterhalt total = 800', close(childCosts.barTotal, 800));
ok('Direkte Kosten: 50/50-Betreuung => kein netto Betreuungsunterhalt',
  close(childCosts.careNetFromAToB, 0) && close(childCosts.careNetFromBToA, 0));
ok('Direkte Kosten: Aufteilung nach Leistungsfähigkeit (7800/13600 bzw. 5800/13600)',
  close(childCosts.barFromA, 800 * (7800 / 13600), 0.05) &&
  close(childCosts.barFromB, 800 * (5800 / 13600), 0.05));

/* ---------- Mangellage ---------- */

/*
 * A: Einkommen 2600, Existenzminimum 2200 -> verfügbar 400
 * B: Einkommen 2300, Existenzminimum 2200 -> verfügbar 100
 * Kind 8 Jahre, B betreut 100%: Bar 640, Betreuungsunterhalt 900.
 * Verfügbares Einkommen deckt weder Bar noch Betreuung -> Manko.
 */

var inputManko = {
  parents: {
    a: { income: 2600, existenzminimum: 2200, employed: true },
    b: { income: 2300, existenzminimum: 2200, employed: true }
  },
  children: [
    { age: 8, ownIncome: 0, childAllowance: 0, kkPremium: 0, externalCareCosts: 0,
      careShareParentA: 0, careShareParentB: 100 }
  ]
};

var resManko = calc.calculateChildSupport(inputManko, CFG);
var childManko = resManko.perChild[0];

ok('Mangellage wird erkannt', resManko.mangellage === true);
ok('Mangellage: A zahlt maximal verfügbares Einkommen',
  close(childManko.barFromA + childManko.careNetFromAToB, 400, 0.01));
ok('Mangellage: B zahlt maximal verfügbares Einkommen',
  close(childManko.barFromB + childManko.careNetFromBToA, 100, 0.01));
ok('Mangellage: Manko total = 1540 - 500 = 1040',
  close(resManko.totals.totalManko, 640 + 900 - 400 - 100, 0.02));

/* ---------- Mehrere Kinder ---------- */

var inputMulti = {
  parents: {
    a: { income: 9000, existenzminimum: 2200, employed: true },
    b: { income: 4000, existenzminimum: 2200, employed: true }
  },
  children: [
    { age: 5, ownIncome: 0, childAllowance: 0, kkPremium: 0, externalCareCosts: 0,
      careShareParentA: 0, careShareParentB: 100 },
    { age: 10, ownIncome: 0, childAllowance: 0, kkPremium: 0, externalCareCosts: 0,
      careShareParentA: 0, careShareParentB: 100 }
  ]
};

var resMulti = calc.calculateChildSupport(inputMulti, CFG);

ok('Mehrere Kinder: zwei Resultate', resMulti.perChild.length === 2);
ok('Mehrere Kinder: Grundbedarf 500/640',
  close(resMulti.perChild[0].basicNeed, 500) && close(resMulti.perChild[1].basicNeed, 640));
ok('Mehrere Kinder: Totale konsistent',
  close(resMulti.totals.totalA,
    resMulti.perChild[0].totalFromA + resMulti.perChild[1].totalFromA, 0.02));

/* ---------- Existenzminimum-Defaults ---------- */

var inputDefault = {
  parents: {
    a: { income: 6000, existenzminimum: null, employed: true },
    b: { income: 0, existenzminimum: null, employed: false }
  },
  children: [
    { age: 8, ownIncome: 0, childAllowance: 0, kkPremium: 0, externalCareCosts: 0,
      careShareParentA: 0, careShareParentB: 100 }
  ]
};

var resDefault = calc.calculateChildSupport(inputDefault, CFG);
ok('Default-Existenzminimum erwerbstätig = 2200',
  close(resDefault.budgets.a.existenzminimum, 2200));
ok('Default-Existenzminimum nicht erwerbstätig = 2000',
  close(resDefault.budgets.b.existenzminimum, 2000));
ok('Bei nur einem leistungsfähigen Elternteil trägt dieser den Barunterhalt',
  close(resDefault.perChild[0].barFromA, 640, 0.01));

/* ---------- Ehegattenunterhalt: Überschussfall ---------- */

/*
 * Berechtigte: Einkommen 2000, Standard 4000 => Bedarf 2000
 * Verpflichteter: Einkommen 8000, Existenzminimum 2200, Kindesunterhalt 1000
 * => Leistungsfähigkeit 4800 >= 2000 -> Beitrag 2000 (Methode surplus).
 */

var spousalSurplus = {
  enabled: true,
  applicant: { income: 2000, existenzminimum: 2000, targetStandard: 4000, extraCosts: 0, employed: true },
  respondent: { income: 8000, existenzminimum: 2200, employed: true },
  childSupportPaidByRespondent: 1000
};

var resSpousal = calc.calculateSpousalSupport(spousalSurplus, CFG);
ok('Ehegattenunterhalt Überschuss: Bedarf = 2000', close(resSpousal.applicant.bedarf, 2000));
ok('Ehegattenunterhalt Überschuss: Leistungsfähigkeit = 4800',
  close(resSpousal.respondent.capacity, 4800));
ok('Ehegattenunterhalt Überschuss: Beitrag = 2000', close(resSpousal.support, 2000));
ok('Ehegattenunterhalt Überschuss: Methode = surplus', resSpousal.method === 'surplus');
ok('Ehegattenunterhalt Überschuss: keine Mangellage', !resSpousal.mangellage);

/* ---------- Ehegattenunterhalt: Mehrkosten erhöhen Bedarf ---------- */

var spousalExtra = {
  enabled: true,
  applicant: { income: 2000, existenzminimum: 2000, targetStandard: 4000, extraCosts: 500, employed: true },
  respondent: { income: 8000, existenzminimum: 2200, employed: true },
  childSupportPaidByRespondent: 1000
};

var resExtra = calc.calculateSpousalSupport(spousalExtra, CFG);
ok('Ehegattenunterhalt: Mehrkosten erhöhen Bedarf auf 2500',
  close(resExtra.applicant.bedarf, 2500) && close(resExtra.support, 2500));

/* ---------- Ehegattenunterhalt: Mangelfall ---------- */

/*
 * Berechtigte: Einkommen 0, EM 2000, Standard 5000, Mehrkosten 0 => Bedarf 5000
 * Verpflichteter: Einkommen 5000, EM 2200, Kindesunterhalt 2000
 * => Leistungsfähigkeit 800 < 5000 -> Mangelfall.
 * Überschuss total = 800 + 0 = 800; EM-Summe 4200;
 * ratio = 2000/4200 = 0.4762 -> Beitrag ~ 380.95.
 */

var spousalManko = {
  enabled: true,
  applicant: { income: 0, existenzminimum: 2000, targetStandard: 5000, extraCosts: 0, employed: true },
  respondent: { income: 5000, existenzminimum: 2200, employed: true },
  childSupportPaidByRespondent: 2000
};

var resSpManko = calc.calculateSpousalSupport(spousalManko, CFG);
ok('Ehegattenunterhalt Mangelfall erkannt', resSpManko.mangellage === true);
ok('Ehegattenunterhalt Mangelfall: Methode = manko', resSpManko.method === 'manko');
ok('Ehegattenunterhalt Mangelfall: Beitrag = 800 * (2000/4200)',
  close(resSpManko.support, 800 * (2000 / 4200), 0.02));
ok('Ehegattenunterhalt Mangelfall: ungedeckter Bedarf ausgewiesen',
  close(resSpManko.mankoBedarf, 5000 - 800 * (2000 / 4200), 0.02));

/* ---------- Ehegattenunterhalt: Verzicht (disabled) ---------- */

var resAll = calc.calculate({ children: inputStd.children, parents: inputStd.parents }, CFG);
ok('calculate() ohne spousal: kein Ehegattenresultat', resAll.spousalSupport === null);
ok('calculate() mit Kind: Kindesresultat vorhanden', resAll.childSupport.perChild.length === 1);

var resAllOn = calc.calculate({
  parents: inputStd.parents,
  children: inputStd.children,
  spousal: spousalSurplus
}, CFG);
ok('calculate() mit spousal: Beitrag 2000', close(resAllOn.spousalSupport.support, 2000));

/* ---------- Zusammenfassung ---------- */

console.log('\n' + passed + ' Tests bestanden' +
  (process.exitCode ? ', FEHLER vorhanden' : ', keine Fehler'));
