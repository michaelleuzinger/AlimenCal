#!/usr/bin/env node
/*
 * AlimenCal – Screenshot-Generator (AGENTS.md: "Screenshot-Erstellung").
 *
 * Erzeugt die PNGs unter screenshots/ (eine Datei je Ansicht und Sprache,
 * fortlaufend nummeriert, Sprache im Suffix). Nutzt Puppeteer/Headless-
 * Chromium; Puppeteer ist ausserhalb des Repos zu installieren
 * (npm i puppeteer, vgl. AGENTS.md).
 *
 * Ausführen:   node tools/make-screenshots.js [--only <nummer>] [Sprachen: --langs de,fr]
 *
 * Der Screenshot-Modus der App (?screenshot=1) blendet rein kosmetische
 * Elemente (Disclaimer-Fussnote) nicht aus; dieses Script füllt zusätzlich
 * plausible, anonymisierte Beispieldaten, damit die Screenshots
 * aussagekräftig sind.
 *
 * Dateinamen: fortlaufend nummeriert, Sprache im Suffix, z. B.
 * screenshots/01-kindesunterhalt-de.png.
 *
 * Inventar-Regel (AGENTS.md): ein Screenshot pro Ansicht/Feature
 * (Default-Sprache Deutsch), genau EINE zusaetzliche fremdsprachige
 * Ansicht als Beleg der Mehrsprachigkeit sowie Theme-Varianten als
 * legitimierte Duplikate. Aenderungen am Set: VIEWS hier, README-Tabelle
 * und Einbettungen im BENUTZERHANDBUCH im selben Change nachfuehren.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const APP_URL = 'file://' + path.join(ROOT, 'index.html');
const OUT_DIR = path.join(ROOT, 'screenshots');

const LANGS = ['de', 'fr', 'it', 'en'];

/* Vereinbarte Geraetetypen (PC, iPhone, iPad) */
const DEVICES = {
  pc:     { width: 1395, height: 2084 },
  iphone: { width: 390,  height: 844 },
  ipad:   { width: 820,  height: 1180 }
};
const DEVICE_KEYS = ['pc', 'iphone', 'ipad'];

const VIEWS = [
  { n: 1, name: 'kindesunterhalt', langs: LANGS, setup: setupChildren, design: 'calm' },
  { n: 2, name: 'ehegattenunterhalt', langs: LANGS, setup: setupSpousal, design: 'calm' },
  { n: 3, name: 'kostentrennung', langs: LANGS, setup: setupCostsplit, design: 'calm' },
  { n: 4, name: 'austausch', langs: LANGS, setup: setupShare, design: 'calm' },
  { n: 5, name: 'hauptmenue', langs: LANGS, setup: setupSettingsMenu, design: 'calm' },
  { n: 6, name: 'richtwerte', langs: LANGS, setup: setupSettings, design: 'calm' },
  { n: 7, name: 'themes-classic', langs: LANGS, setup: setupThemesClassic },
  { n: 8, name: 'themes-dark', langs: LANGS, setup: setupThemesDark },
  { n: 9, name: 'themes-designs', langs: LANGS, setup: setupThemesDesignsCalm },
  { n: 10, name: 'hero-calm', langs: LANGS, setup: setupHeroCalm },
  { n: 11, name: 'hero-classic', langs: ['de'], devices: ['pc'], setup: setupHeroClassic },
  { n: 12, name: 'hero-calm-dark', langs: ['de'], devices: ['pc'], setup: setupHeroCalmDark },
  { n: 13, name: 'hero-editorial', langs: ['de'], devices: ['pc'], setup: setupHeroEditorial },
  { n: 14, name: 'hero-neubrutalism', langs: ['de'], devices: ['pc'], setup: setupHeroNeubrutalism },
  { n: 15, name: 'backup', langs: LANGS, setup: setupBackup, design: 'calm' },
  { n: 16, name: 'restore', langs: LANGS, setup: setupRestore, design: 'calm' }
];

/* ---------- Beispieldaten (anonymisiert, keine echten Personen) ---------- */

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setLang(page, lang) {
  await page.select('#lang-select', lang);
  await sleep(150);
}

async function switchTab(page, name) {
  await page.evaluate(n => {
    const el = document.querySelector('.tab[data-tab="' + n + '"]');
    if (el) { el.click(); return; }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true }));
  }, name);
  await sleep(150);
}

async function fill(page, sel, value) {
  await page.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (el) {
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, sel, value);
}

async function clickCalculateChildren(page) {
  await page.evaluate(() => document.getElementById('calc-children').click());
  await sleep(200);
}

async function setupChildren(page) {
  await switchTab(page, 'children');
  await fill(page, '#pa-income', '6800');
  await fill(page, '#pa-em', '2300');
  await fill(page, '#pb-income', '4200');
  await fill(page, '#pb-em', '2100');
  await sleep(100);
  const vals = [
    { age: 6, kk: '130', careA: '40', careB: '60', mode: 'pauschal' },
    { age: 9, kk: '140', careA: '50', careB: '50', mode: 'effective', eff: '1650' },
    { age: 15, kk: '160', careA: '30', careB: '70', mode: 'pauschal' }
  ];
  for (let i = 0; i < vals.length; i++) {
    await page.evaluate(() => document.getElementById('add-child').click());
    await sleep(100);
  }
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    await page.evaluate((idx, mode) => {
      const sel = document.querySelectorAll('#children-list .child-row')[idx].querySelector('.f-mode');
      if (sel.value !== mode) {
        sel.value = mode;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, i, v.mode);
    await sleep(150);
    await page.evaluate((idx, age, kk, careA, careB, eff) => {
      const row = document.querySelectorAll('#children-list .child-row')[idx];
      const set = (el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set(row.querySelector('.f-age'), age);
      set(row.querySelector('.f-kk'), kk);
      set(row.querySelector('.f-shareA'), careA);
      set(row.querySelector('.f-shareB'), careB);
      const effEl = row.querySelector('.f-eff');
      if (effEl && eff != null) { set(effEl, eff); }
    }, i, String(v.age), v.kk, v.careA, v.careB, v.eff || null);
    await sleep(50);
  }
  await clickCalculateChildren(page);
}

async function setupSpousal(page) {
  await switchTab(page, 'spousal');
  await page.evaluate(() => {
    const cb = document.getElementById('spousal-enabled');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await fill(page, '#sp-app-income', '2400');
  await fill(page, '#sp-app-standard', '4200');
  await fill(page, '#sp-app-extra', '300');
  await fill(page, '#sp-res-income', '7600');
  await fill(page, '#sp-res-childpaid', '1200');
  await page.evaluate(() => document.getElementById('calc-spousal').click());
  await sleep(200);
}

async function setupSettingsMenu(page) {
  /* Hauptmenue ist seit dem SOTA-Redesign die Topbar (nicht-modal);
     der Shot bleibt ohne zusaetzliche Interaktion auf dem Kindesunterhalt-Tab. */
  await switchTab(page, 'children');
}

async function setupSettings(page) {
  await switchTab(page, 'settings');
  // Verbindliche Einstellungen: alle vier Basiswerte beidseitig bestätigen,
  // Schlüssel erzeugen (Krypto-Sektion), dann Override-Modus aktivieren
  // (vgl. docs/settings-binding-override.md).
  await sleep(150);
  await page.evaluate(() => {
    document.getElementById('keys-generate-a').click();
    document.getElementById('keys-generate-b').click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const btns = document.querySelectorAll('#binding-tbody button');
    btns.forEach(b => b.click());
  });
  await sleep(300);
  await page.evaluate(() => {
    const cb = document.getElementById('binding-override-mode');
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(150);
  await page.evaluate(() => {
    const row = document.querySelectorAll('#binding-tbody tr')[1];
    const inp = row && row.querySelector('input[type="number"]');
    if (inp) {
      inp.value = '2100';
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(150);
}

async function setupCostsplit(page) {
  await switchTab(page, 'costsplit');
  // Anonymisierter Demo-Bankexport (keine echten Daten, vgl. AGENTS.md).
  // Belastung/Gutschrift in separaten Spalten; Ausgaben teils 50/50,
  // teils voll einer Partei zugewiesen.
  const csv = [
    'Datum;Beschreibung;Belastung;Gutschrift',
    '2025-02-05;Miete Wohnung;1800;',
    '2025-02-08;Lebensmittel Supermarkt;142.50;',
    '2025-02-12;Krankenkasse Kinder;390;',
    '2025-02-15;Kita-Rechnung;950;',
    '2025-02-20;Lohnzahlung;;6800'
  ].join('\n');
  const tmp = path.join(os.tmpdir(), 'alimencal-demo-export.csv');
  fs.writeFileSync(tmp, csv, 'utf8');
  const input = await page.$('#costsplit-file');
  await input.uploadFile(tmp);
  await sleep(400);
  await page.evaluate(() => document.getElementById('costsplit-set-all-split').click());
  await sleep(200);
  await page.evaluate(() => {
    const modes = { t1: 'split', t2: 'split', t3: 'split', t4: 'partyB', t5: 'ignore' };
    document.querySelectorAll('#costsplit-tbody tr').forEach(tr => {
      const sel = tr.querySelector('select');
      if (!sel) { return; }
      // Reihenfolge entspricht der Transaktionsreihenfolge (t1..t5)
      const idx = Array.prototype.indexOf.call(
        tr.parentElement.querySelectorAll('tr'), tr);
      const key = 't' + (idx + 1);
      if (modes[key]) {
        sel.value = modes[key];
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
  await sleep(200);
  await page.evaluate(() => {
    const el = document.getElementById('costsplit-owner');
    el.value = 'A';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(200);
}

async function setupThemesClassic(page) {
  await switchTab(page, 'themes');
}

async function setupThemesDark(page) {
  await switchTab(page, 'themes');
  await page.select('#theme-select', 'dark');
  await sleep(200);
}

async function setupShare(page) {
  await switchTab(page, 'share');
}

async function setupBackup(page) {
  await switchTab(page, 'share');
  await setupChildren(page);
  await switchTab(page, 'share');
  /* Download-Dialog unterdruecken; Statusmeldung ("Backup erstellt") bleibt sichtbar */
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', {
    behavior: 'allow', downloadPath: os.tmpdir()
  });
  await page.evaluate(() => document.getElementById('share-backup').click());
  await sleep(400);
}

async function setupRestore(page) {
  await switchTab(page, 'share');
  /* Vollstaendiges Beispiel-Backup (alle Abschnitte + Einstellungen)
     mit denselben anonymisierten Demo-Daten wie View 01 */
  const casedata = require(path.join(ROOT, 'js', 'casedata.js'));
  const backup = casedata.buildBackupFile({
    parentA: { name: 'Beispiel A', income: 6800 },
    parentB: { name: 'Beispiel B', income: 4200 },
    children: [],
    spousalEnabled: false
  }, { lang: 'de', theme: { id: 'calm' } });
  const tmp = path.join(os.tmpdir(), 'alimencal-demo-backup.json');
  fs.writeFileSync(tmp, JSON.stringify(backup, null, 2), 'utf8');
  const input = await page.$('#share-restore');
  await input.uploadFile(tmp);
  await sleep(500);
}

/* ---------- Design-Stile (Themes-Tab, neue Karten) ---------- */

async function selectDesign(page, design) {
  await page.evaluate(d => {
    document.querySelector('#design-grid .design-card[data-design="' + d + '"]').click();
  }, design);
  await sleep(200);
}

async function setupThemesDesignsCalm(page) {
  await switchTab(page, 'themes');
  await selectDesign(page, 'calm');
}
async function setupHeroCalm(page) {
  await selectDesign(page, 'calm');
  await setupChildren(page);
}
async function setupHeroClassic(page) {
  await selectDesign(page, 'base');
  await setupChildren(page);
}
async function setupHeroCalmDark(page) {
  await selectDesign(page, 'calm-dark');
  await setupChildren(page);
}
async function setupHeroEditorial(page) {
  await selectDesign(page, 'editorial');
  await setupChildren(page);
}
async function setupHeroNeubrutalism(page) {
  await selectDesign(page, 'neubrutalism');
  await setupChildren(page);
}

/* ---------- Hauptprogramm ---------- */
async function run() {
  const only = process.argv.includes('--only')
    ? parseInt(process.argv[process.argv.indexOf('--only') + 1], 10)
    : null;
  const devices = process.argv.includes('--devices')
    ? process.argv[process.argv.indexOf('--devices') + 1].split(',').filter(d => DEVICE_KEYS.includes(d))
    : DEVICE_KEYS;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });
  try {
    for (const view of VIEWS) {
      if (only && view.n !== only) { continue; }
      const viewDevices = view.devices ? devices.filter(d => view.devices.includes(d)) : devices;
      for (const device of viewDevices) {
        for (const lang of view.langs) {
          const page = await browser.newPage();
          await page.setViewport({ ...DEVICES[device], deviceScaleFactor: 1 });
          page.on('pageerror', e => console.error('PAGE ERROR:', String(e)));
          await page.goto(APP_URL + '?screenshot=1', { waitUntil: 'networkidle0' });
          await sleep(200);
          await setLang(page, lang);
          if (view.design) { await selectDesign(page, view.design); }
          await view.setup(page);
          await sleep(300);
          const num = String(view.n).padStart(2, '0');
          const deviceDir = path.join(OUT_DIR, device);
          fs.mkdirSync(deviceDir, { recursive: true });
          const file = path.join(deviceDir, num + '-' + view.name + '-' + lang + '.png');
          await page.screenshot({ path: file, fullPage: false });
          console.log('created', path.relative(ROOT, file));
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
