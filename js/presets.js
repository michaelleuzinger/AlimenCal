/*
 * AlimenCal – Kantonale Presets.
 *
 * Eingebettete Kopie der JSON-Dateien unter presets/ (damit die App auch ohne
 * Webserver via file:// läuft). tests/presets.test.js prüft die Konsistenz
 * zwischen diesem Modul und den JSON-Dateien.
 */
var AlimenCal = typeof AlimenCal !== 'undefined' ? AlimenCal : {};

AlimenCal.presets = [
  {
    meta: {
      id: 'zuerich-2025',
      name: 'Kanton Zürich – Kinderkosten-Tabelle 2025',
      canton: 'ZH',
      validFrom: '2025-03-01',
      source: 'Zürcher Kinderkosten-Tabelle vom 1. März 2025, Amt für Jugend und Berufsberatung des Kantons Zürich',
      url: 'https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/familie/sorgerecht-unterhalt/zuercher_kinderkosten_tabelle.pdf',
      notes: [
        'Grundbedarf = Gesamtkosten Einzelkind lt. Tabelle (1440/1575/1920) minus enthaltener durchschnittlicher Kinder-Krankenkassenprämie von CHF 130; die effektive Prämie wird in der App separat erfasst.',
        'Die Tabelle kann über das 18. Altersjahr bis zum 21. Altersjahr angewendet werden, wenn der junge Erwachsene im Haushalt eines Elternteils lebt.',
        'Per 2026 wird die Zürcher Kinderkosten-Tabelle nicht mehr weitergeführt; seit BGE 147 III 265 ist die zweistufig-konkrete Methode verbindlich, pauschalierende Tabellen sind unzulässig. Werte dienen als Vergleichsmasse.',
        'Betreuungsunterhalts-Richtwerte sind Orientierungswerte (nicht Teil der amtlichen Tabelle); kantonale Praxis ist massgebend.'
      ],
      verification: [
        'Krankenkassenprämie des Kindes effektiv erfassen (Default-Abzug CHF 130 ist bereits berücksichtigt)',
        'Drittbetreuungskosten separat erfassen (nicht in der Tabelle enthalten)',
        'Bei Mehrkindhaushalten: Tabelle weist reduzierte Werte für 1 von 2 bzw. 1 von 3 Kindern aus (1150/1355/1710 bzw. 1015/1245/1620) – ggf. manuell anpassen'
      ]
    },
    defaultExistenzminimumEmployed: 2200,
    defaultExistenzminimumNotEmployed: 2000,
    childNeedTable: [
      { fromAge: 0, toAge: 6, basicNeed: 1310, careSupport: 1100 },
      { fromAge: 7, toAge: 12, basicNeed: 1445, careSupport: 900 },
      { fromAge: 13, toAge: 17, basicNeed: 1790, careSupport: 700 },
      { fromAge: 18, toAge: 99, basicNeed: 1790, careSupport: 0 }
    ],
    careSupportMaxAge: 17,
    fallbackChildBasicNeed: 1310,
    defaultSpousalStandard: 4000
  },
  {
    meta: {
      id: 'schaffhausen-offen',
      name: 'Kanton Schaffhausen – Ansätze offen (Verifikation erforderlich)',
      canton: 'SH',
      validFrom: null,
      source: 'Keine publizierte kantonale Tabelle. Die KESB Schaffhausen wendet laut Merkblatt zum neuen Unterhaltsrecht (Ziff. 4) dasselbe Berechnungsmodell an wie das Kantonsgericht Schaffhausen; die konkreten Ansätze sind nicht veröffentlicht.',
      url: 'https://sh.ch/CMS/Webseite/Kanton-Schaffhausen/Beh-rde/Justiz/Kindes--und-Erwachsenenschutzbeh-rde--KESB-/Unterhalt-und-Sorgerecht-regeln-1233353-DE.html',
      notes: [
        'DISCLAIMER: Dieses Preset enthält Platzhalterwerte (identisch mit dem App-Default) und ist NICHT mit der Schaffhauser Praxis verifiziert.',
        'Vor Verwendung in einem Schaffhauser Fall MÜSSEN die effektiven Ansätze des Kantonsgerichts Schaffhausen bzw. der KESB erhoben und hier eingetragen werden.'
      ],
      verification: [
        'KESB Schaffhausen, Mühlentalstrasse 65A, 8200 Schaffhausen: Merkblätter/Formulare und Berechnungsmodell anfordern',
        'Kantonsgericht Schaffhausen: veröffentlichte Rechtsprechung zu Unterhaltsansätzen (sh.gerichtsentscheide) auswerten',
        'Effektive Existenzminimum-Ansätze (z. B. aus betreibungsrechtlichen Richtlinien des Kantons SH) eintragen',
        'Effektive Grundbedarfs- und Betreuungsunterhaltsansätze eintragen und dokumentieren (Quelle, Datum, Fundstelle)',
        'Einholen der Werte bei der KESB ist kostenpflichtig (Vorschuss CHF 400; Ausarbeitung mind. CHF 300)'
      ]
    },
    defaultExistenzminimumEmployed: 2200,
    defaultExistenzminimumNotEmployed: 2000,
    childNeedTable: [
      { fromAge: 0, toAge: 6, basicNeed: 1310, careSupport: 1100 },
      { fromAge: 7, toAge: 12, basicNeed: 1445, careSupport: 900 },
      { fromAge: 13, toAge: 17, basicNeed: 1790, careSupport: 700 },
      { fromAge: 18, toAge: 99, basicNeed: 1790, careSupport: 0 }
    ],
    careSupportMaxAge: 17,
    fallbackChildBasicNeed: 1310,
    defaultSpousalStandard: 4000
  }
];
