/*
 * AlimenCal – Konfiguration (Richtwerte als Default, überschreibbar).
 *
 * Datenstand und Quellen (Stand: März 2025):
 *  - Grundbedarf Kind: Zürcher Kinderkosten-Tabelle vom 1. März 2025
 *    (Amt für Jugend und Berufsberatung des Kantons Zürich), Einzelkind-Werte,
 *    inkl. Krankenkassenprämien-Position; ohne Drittbetreuungskosten und
 *    ohne Betreuungsunterhalt. Die Tabelle kann über das 18. Altersjahr bis
 *    zum 21. Altersjahr angewendet werden. Per 2026 wird die Zürcher Tabelle
 *    nicht mehr weitergeführt; massgeblich ist seit BGer 147 III 265 die
 *    zweistufig-konkrete Methode (BGE 140 III 337), weshalb die Werte nur als
 *    Vergleichsmasse dienen.
 *  - Existenzminimum: betreibungsrechtliche Richtlinien (KK-BSV, Art. 93
 *    SchKG), typische Werte; kantonale Praxis ist massgebend und kann
 *    abweichen – insb. gilt das für Schaffhausen (keine publizierte
 *    kantonale Tabelle; die KESB SH wendet dasselbe Modell wie das
 *    Kantonsgericht SH an, dessen Ansätze nicht publiziert sind).
 *
 * Alle Werte sind Orientierungswerte und MÜSSEN vor einem produktiven
 * Einsatz an die massgebliche kantonale Praxis (z. B. KESB Schaffhausen /
 * Kantonsgericht Schaffhausen) angepasst bzw. verifiziert werden.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.config = {
  // Währung und Formatierung
  currency: 'CHF',

  // Existenzminimum (Notbedarf) je Elternteil in CHF/Monat
  defaultExistenzminimumEmployed: 2200,
  defaultExistenzminimumNotEmployed: 2000,

  // Grundbedarf des Kindes (Barunterhalt OHNE Krankenkassenprämie und ohne
  // Fremdbetreuung), CHF/Monat, gestaffelt nach Altersjahren (vollendete
  // Altersjahre).
  // Quelle: Zürcher Kinderkosten-Tabelle vom 1. März 2025 (Einzelkind,
  // Gesamtkosten inkl. Wohnen): 1.–4. Altersjahr Fr. 1440.–, 5.–12.
  // Altersjahr Fr. 1575.–, 13.–18. Altersjahr Fr. 1920.–.
  // Die Tabellenwerte beinhalten eine durchschnittliche Kinder-Krankenkassen-
  // prämie von Fr. 130.–; diese wird hier abgezogen, weil die effektive
  // Prämie in der App separat erfasst wird (verhindert Doppelerfassung).
  // Ergibt: 1440-130=1310, 1575-130=1445, 1920-130=1790.
  // Die Tabelle kann über das 18. Altersjahr bis zum 21. Altersjahr
  // angewendet werden. Fremdbetreuungskosten sind separat zu erfassen.
  childNeedTable: [
    { fromAge: 0,  toAge: 6,  basicNeed: 1310, careSupport: 1100 },
    { fromAge: 7,  toAge: 12, basicNeed: 1445, careSupport: 900 },
    { fromAge: 13, toAge: 17, basicNeed: 1790, careSupport: 700 },
    { fromAge: 18, toAge: 99, basicNeed: 1790, careSupport: 0 }
  ],

  // Betreuungsunterhalt nur bis zu diesem Alter (Richtwert-Logik),
  // falls die Tabelle keinen Wert vorsieht (ab 18 ohnehin 0).
  careSupportMaxAge: 17,

  // Fallback, wenn keine Alterszeile passt
  fallbackChildBasicNeed: 1310,

  // Nachehelicher/trennungsbedingter Unterhalt (Orientierungswert)
  defaultSpousalStandard: 4000
};
