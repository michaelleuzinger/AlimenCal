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

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
  await browser.close();
})();
