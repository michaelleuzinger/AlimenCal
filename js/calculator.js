/*
 * AlimenCal – Unterhaltsrechner (Orientierungstool)
 * Berechnungskern: Kindesunterhalt (Art. 276, 285 f. ZGB) und
 * Ehegattenunterhalt (Art. 176 ZGB / Art. 125 ZGB).
 *
 * Der Kern ist bewusst frei von DOM-Zugriff gehalten, damit er sowohl im
 * Browser als auch in Node.js (Unit-Tests) lauffähig ist.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.calculator = (function () {
  'use strict';

  var EPS = 1e-9;

  function num(value, fallback) {
    var n = typeof value === 'number' ? value : parseFloat(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  function round2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }

  /* ------------------------------------------------------------------ *
   *  Existenzminimum / verfügbares Einkommen eines Elternteils          *
   * ------------------------------------------------------------------ */

  function parentBudget(parent, cfg) {
    var income = num(parent && parent.income);
    var em;
    if (parent && parent.existenzminimum != null && isFinite(parseFloat(parent.existenzminimum))) {
      em = num(parent.existenzminimum);
    } else {
      var key = 'defaultExistenzminimum' +
        (parent && parent.employed === false ? 'NotEmployed' : 'Employed');
      em = num(cfg[key]);
    }
    return {
      income: income,
      existenzminimum: em,
      available: Math.max(0, income - em)
    };
  }

  /* ------------------------------------------------------------------ *
   *  Kindesunterhalt                                                     *
   * ------------------------------------------------------------------ */

  function findAgeRow(age, cfg) {
    var table = cfg.childNeedTable || [];
    for (var i = 0; i < table.length; i++) {
      var row = table[i];
      var from = row.fromAge != null ? row.fromAge : 0;
      var to = row.toAge != null ? row.toAge : Infinity;
      if (age >= from && age <= to) {
        return row;
      }
    }
    return null;
  }

  function childBasicNeed(child, cfg) {
    var row = findAgeRow(num(child.age), cfg);
    if (!row) {
      return num(cfg.fallbackChildBasicNeed);
    }
    return num(row.basicNeed);
  }

  function childCareSupportRichtwert(child, cfg) {
    var age = num(child.age);
    var row = findAgeRow(age, cfg);
    if (!row) {
      return 0;
    }
    if (cfg.careSupportMaxAge != null && age > num(cfg.careSupportMaxAge)) {
      return 0;
    }
    return num(row.careSupport);
  }

  function normalizeCareShares(child) {
    var a = clamp(num(child.careShareParentA), 0, 1);
    var b = clamp(num(child.careShareParentB), 0, 1);
    var sum = a + b;
    if (sum <= EPS) {
      return { a: 0.5, b: 0.5, normalized: true };
    }
    if (Math.abs(sum - 1) > EPS) {
      return { a: a / sum, b: b / sum, normalized: true };
    }
    return { a: a, b: b, normalized: false };
  }

  /**
   * Berechnet den Kindesunterhalt für alle Kinder.
   *
   * Modell (vereinfachte Bedarfsberechnung nach der individuellen Methode,
   * vgl. BGE 140 III 337):
   *  - Barunterhalt = Grundbedarf + direkte Kosten (KK-Prämie,
   *    Fremdbetreuung) - Kindeseinkommen (inkl. Kinderzulage).
   *  - Aufteilung des Barunterhalts nach wirtschaftlicher Leistungsfähigkeit
   *    (Anteil am gesamten frei verfügbaren Einkommen).
   *  - Betreuungsunterhalt: Richtwert, proportional zur Betreuung während
   *    der ordentlichen Arbeitszeit; Netto-Verrechnung zwischen den Eltern
   *    (bei 50/50 ergibt sich per Saldo kein Betreuungsunterhalt).
   *  - Mangellage: Der Anteil eines Elternteils wird auf das frei verfügbare
   *    Einkommen gedeckelt; die Unterdeckung wird als Manko ausgewiesen.
   */
  function calculateChildSupport(input, cfg) {
    var parents = input.parents || {};
    var budgetA = parentBudget(parents.a, cfg);
    var budgetB = parentBudget(parents.b, cfg);
    var totalAvailable = budgetA.available + budgetB.available;

    var children = input.children || [];
    var perChild = [];
    var totals = {
      barFromA: 0,
      barFromB: 0,
      barManko: 0,
      careNetFromAToB: 0,
      careNetFromBToA: 0,
      careManko: 0
    };

    var remainingA = budgetA.available;
    var remainingB = budgetB.available;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      var age = num(child.age);
      var basicNeed = childBasicNeed(child, cfg);
      var childIncome = num(child.ownIncome) + num(child.childAllowance);
      var kkPremium = num(child.kkPremium);
      var externalCare = num(child.externalCareCosts);
      var directCosts = kkPremium + externalCare;

      var barTotal = Math.max(0, basicNeed + directCosts - childIncome);

      var shares = normalizeCareShares(child);
      var careRichtwert = childCareSupportRichtwert(child, cfg);
      var careEntitlementA = round2(careRichtwert * shares.a);
      var careEntitlementB = round2(careRichtwert * shares.b);

      var careNetAtoB = Math.max(0, careEntitlementB - careEntitlementA);
      var careNetBtoA = Math.max(0, careEntitlementA - careEntitlementB);

      // Aufteilung des Barunterhalts nach frei verfügbarem Einkommen.
      var shareA = totalAvailable > EPS ? budgetA.available / totalAvailable : 0.5;
      var shareB = 1 - shareA;
      var barTargetA = round2(barTotal * shareA);
      var barTargetB = round2(barTotal - barTargetA);

      // Deckelung in der Mangellage.
      var barPaidA = Math.min(barTargetA, remainingA);
      var barPaidB = Math.min(barTargetB, remainingB);
      remainingA -= barPaidA;
      remainingB -= barPaidB;

      var carePaidA = Math.min(careNetAtoB, remainingA);
      var carePaidB = Math.min(careNetBtoA, remainingB);
      remainingA -= carePaidA;
      remainingB -= carePaidB;

      var barManko = round2(barTotal - barPaidA - barPaidB);
      var careManko = round2((careNetAtoB - carePaidA) + (careNetBtoA - carePaidB));

      totals.barFromA += barPaidA;
      totals.barFromB += barPaidB;
      totals.barManko += barManko;
      totals.careNetFromAToB += carePaidA;
      totals.careNetFromBToA += carePaidB;
      totals.careManko += careManko;

      perChild.push({
        index: i,
        age: age,
        basicNeed: round2(basicNeed),
        directCosts: round2(directCosts),
        kkPremium: round2(kkPremium),
        externalCare: round2(externalCare),
        childIncome: round2(childIncome),
        barTotal: round2(barTotal),
        barFromA: round2(barPaidA),
        barFromB: round2(barPaidB),
        barManko: round2(barManko),
        careShareParentA: shares.a,
        careShareParentB: shares.b,
        careSharesNormalized: shares.normalized,
        careSupportRichtwert: round2(careRichtwert),
        careNetFromAToB: round2(carePaidA),
        careNetFromBToA: round2(carePaidB),
        careManko: round2(careManko),
        totalFromA: round2(barPaidA + carePaidA),
        totalFromB: round2(barPaidB + carePaidB)
      });
    }

    // Rundung auf Totalen
    ['barFromA', 'barFromB', 'barManko', 'careNetFromAToB', 'careNetFromBToA', 'careManko']
      .forEach(function (k) { totals[k] = round2(totals[k]); });
    totals.totalA = round2(totals.barFromA + totals.careNetFromAToB);
    totals.totalB = round2(totals.barFromB + totals.careNetFromBToA);
    totals.totalManko = round2(totals.barManko + totals.careManko);

    return {
      budgets: { a: budgetA, b: budgetB },
      totalAvailable: round2(totalAvailable),
      perChild: perChild,
      totals: totals,
      mangellage: totals.totalManko > EPS
    };
  }

  /* ------------------------------------------------------------------ *
   *  Ehegattenunterhalt (Art. 176 ZGB bzw. Art. 125 ZGB)                *
   * ------------------------------------------------------------------ */

  /**
   * Berechnet den Unterhaltsbeitrag an einen Ehegatten.
   *
   * Methode (Notbedarfsberechnung mit Überschussverteilung,
   * vgl. BGE 140 III 337; Mankoverteilung nach BGE 135 III 66):
   *
   *  - Bedarf des berechtigten Ehegatten = gebührlicher Bedarf
   *    (Lebensstandard, inkl. trennungsbedingter Mehrkosten) - eigenes
   *    Einkommen, mindestens aber 0.
   *  - Leistungsfähigkeit des verpflichteten Ehegatten = Einkommen - eigenes
   *    Existenzminimum - bereits bezahlter Kindesunterhalt.
   *  - Reicht die Leistungsfähigkeit: Beitrag = Bedarf.
   *  - Mangellage: beide behalten ihr volles Existenzminimum; der gesamte
   *    frei verfügbare Überschuss wird im Verhältnis der Existenzminima
   *    verteilt (BGE 135 III 66).
   */
  function calculateSpousalSupport(input, cfg) {
    var applicant = input.applicant || {};
    var respondent = input.respondent || {};

    var applicantBudget = parentBudget(applicant, cfg);
    var respondentBudget = parentBudget(respondent, cfg);

    var standard = num(applicant.targetStandard, num(cfg.defaultSpousalStandard));
    var extraCosts = num(applicant.extraCosts);
    var applicantIncome = applicantBudget.income;

    var bedarf = Math.max(0, standard + extraCosts - applicantIncome);

    var childSupportPaidByRespondent = num(input.childSupportPaidByRespondent);
    var capacity = Math.max(0,
      respondentBudget.income - respondentBudget.existenzminimum - childSupportPaidByRespondent);

    var support;
    var method;
    var mangellage = false;

    if (capacity >= bedarf - EPS) {
      support = bedarf;
      method = 'surplus';
    } else {
      mangellage = true;
      method = 'manko';
      var surplusTotal = capacity + applicantBudget.available;
      var emSum = applicantBudget.existenzminimum + respondentBudget.existenzminimum;
      var ratio = emSum > EPS
        ? applicantBudget.existenzminimum / emSum
        : 0.5;
      support = round2(surplusTotal * ratio);
    }

    return {
      applicant: {
        income: round2(applicantBudget.income),
        existenzminimum: round2(applicantBudget.existenzminimum),
        available: round2(applicantBudget.available),
        targetStandard: round2(standard),
        extraCosts: round2(extraCosts),
        bedarf: round2(bedarf)
      },
      respondent: {
        income: round2(respondentBudget.income),
        existenzminimum: round2(respondentBudget.existenzminimum),
        childSupportPaid: round2(childSupportPaidByRespondent),
        capacity: round2(capacity)
      },
      support: round2(support),
      method: method,
      mangellage: mangellage,
      mankoBedarf: round2(Math.max(0, bedarf - support))
    };
  }

  /* ------------------------------------------------------------------ *
   *  Gesamtresultat                                                      *
   * ------------------------------------------------------------------ */

  function calculate(input, cfg) {
    var childResult = calculateChildSupport(input, cfg);
    var spousalInput = (input.spousal && input.spousal.enabled)
      ? input.spousal
      : null;
    var spousalResult = spousalInput ? calculateSpousalSupport(spousalInput, cfg) : null;

    return {
      childSupport: childResult,
      spousalSupport: spousalResult
    };
  }

  return {
    calculate: calculate,
    calculateChildSupport: calculateChildSupport,
    calculateSpousalSupport: calculateSpousalSupport,
    parentBudget: parentBudget,
    childBasicNeed: childBasicNeed,
    childCareSupportRichtwert: childCareSupportRichtwert,
    normalizeCareShares: normalizeCareShares,
    round2: round2,
    clamp: clamp,
    num: num
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = AlimenCal.calculator;
}
