/*
 * AlimenCal – Konfiguration (Richtwerte als Default, überschreibbar).
 *
 * Die Werte sind typische Orientierungswerte der kantonalen Praxis
 * (vgl. KOKES-Leitfaden, Zürcher Kinderkostentabelle). Sie sind bewusst
 * konservativ und konsistent gewählt und MÜSSEN vor einem produktiven
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

  // Grundbedarf des Kindes (Barunterhalt ohne direkte Kosten), CHF/Monat,
  // gestaffelt nach Alter (Jahre), angelehnt an die Zürcher
  // Kinderkostentabelle (konservative Werte).
  childNeedTable: [
    { fromAge: 0,  toAge: 6,  basicNeed: 500,  careSupport: 1100 },
    { fromAge: 7,  toAge: 12, basicNeed: 640,  careSupport: 900 },
    { fromAge: 13, toAge: 17, basicNeed: 720,  careSupport: 700 },
    { fromAge: 18, toAge: 99, basicNeed: 900,   careSupport: 0 }
  ],

  // Betreuungsunterhalt nur bis zu diesem Alter, falls die Tabelle keinen
  // Wert vorsieht (ab 18 ohnehin 0).
  careSupportMaxAge: 17,

  // Fallback, wenn keine Alterszeile passt
  fallbackChildBasicNeed: 600,

  // Nachehelicher/trennungsbedingter Unterhalt (Orientierungswert)
  defaultSpousalStandard: 4000
};
