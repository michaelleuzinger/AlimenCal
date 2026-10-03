#!/usr/bin/env node
/*
 * AlimenCal – Mockup-Vorschau-Generator.
 *
 * Erzeugt PNG-Screenshots der statischen Redesign-Mockups unter
 * design/mockups/previews/ (eine Datei je Mockup, full-page, 2x Retina).
 * Nutzt Puppeteer/Headless-Chromium; Puppeteer ist ausserhalb des Repos zu
 * installieren (npm i puppeteer, vgl. AGENTS.md / tools/make-screenshots.js).
 *
 * Ausfuehren:   node tools/make-mockup-previews.js
 *
 * Die PNGs werden in README.md (Abschnitt «Redesign-Mockups») und
 * docs/REDESIGN-MOCKUPS.md eingebettet; Aenderungen am Set sind dort im
 * selben Change nachzufuehren (Docs-in-sync-Regel, AGENTS.md).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const ROOT = path.resolve(__dirname, '..');
const MOCKUP_DIR = path.join(ROOT, 'design', 'mockups');
const OUT_DIR = path.join(MOCKUP_DIR, 'previews');

const MOCKUPS = [
  'mockup-apple',
  'mockup-google',
  'mockup-minimal',
  'mockup-bento',
  'mockup-dark',
  'mockup-neubrutalism',
  'index',
];

/* V2-Konzepte (Redesign nach Main-Update): je Desktop- und Mobile-Ansicht */
const V2_DIR = path.join(ROOT, 'design', 'mockups-v2');
const V2_OUT = path.join(V2_DIR, 'previews');
const V2_SHOTS = [
  { f: 'mockup-sidebar', out: 'sidebar-desktop', w: 1280, h: 900, full: false },
  { f: 'mockup-sidebar', out: 'sidebar-mobile', w: 400, h: 780, full: true },
  { f: 'mockup-wizard', out: 'wizard-desktop', w: 1280, h: 900, full: false },
  { f: 'mockup-wizard', out: 'wizard-mobile', w: 400, h: 780, full: true },
  { f: 'mockup-editorial', out: 'editorial-desktop', w: 1280, h: 900, full: false },
  { f: 'mockup-editorial', out: 'editorial-mobile', w: 400, h: 780, full: true },
  { f: 'mockup-command', out: 'command-desktop', w: 1280, h: 800, full: false },
  { f: 'mockup-command', out: 'command-mobile', w: 640, h: 700, full: true },
  { f: 'index', out: 'gallery', w: 1280, h: 900, full: false },
  /* Empfehlung (Kombination): Desktop-Sektionen + Mobile */
  { f: 'mockup-empfehlung', out: 'empfehlung-1-desktop-top', w: 1280, h: 900, full: false, scrollTo: 0 },
  { f: 'mockup-empfehlung', out: 'empfehlung-4-mobile-full', w: 400, h: 780, full: true },
  /* Empfehlung im Apple-Design (HIG-Farbwelt) */
  { f: 'mockup-empfehlung-apple', out: 'apple-empfehlung-1-desktop-top', w: 1280, h: 900, full: false, scrollTo: 0 },
  { f: 'mockup-empfehlung-apple', out: 'apple-empfehlung-2-desktop-eingaben', w: 1280, h: 900, full: false, scrollTo: 620 },
  { f: 'mockup-empfehlung-apple', out: 'apple-empfehlung-3-desktop-resultat', w: 1280, h: 900, full: false, scrollTo: 99999 },
  { f: 'mockup-empfehlung-apple', out: 'apple-empfehlung-4-mobile-full', w: 400, h: 780, full: true },
];

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(V2_OUT, { recursive: true });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  for (const name of MOCKUPS) {
    const file = path.join(MOCKUP_DIR, `${name}.html`);
    await page.goto('file://' + file, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({
      path: path.join(OUT_DIR, `${name}.png`),
      fullPage: true,
    });
    console.log('OK', name);
  }
  for (const s of V2_SHOTS) {
    await page.setViewport({ width: s.w, height: s.h, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(V2_DIR, `${s.f}.html`), { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 350));
    if (s.scrollTo != null) { await page.evaluate((y) => window.scrollTo(0, y), s.scrollTo); await new Promise((r) => setTimeout(r, 250)); }
    await page.screenshot({ path: path.join(V2_OUT, `${s.out}.png`), fullPage: s.full });
    console.log('OK', s.out);
  }
  await browser.close();
})();
