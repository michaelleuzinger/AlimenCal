#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');

let puppeteer;
try { puppeteer = require('puppeteer'); }
catch (e) { puppeteer = require('/tmp/node_modules/puppeteer'); }

const MOCKUPS = [
  'mockup-calm-fintech',
  'mockup-guidance-flow',
  'mockup-workspace-hub',
];

const DEVICES = [
  { suffix: 'pc', width: 1280, height: 900, dsf: 2, mobile: false },
  { suffix: 'iphone', width: 390, height: 844, dsf: 3, mobile: true },
];

async function run() {
  const root = path.join(__dirname, '..', 'design', 'mockups-v3');
  const outDir = path.join(root, 'previews');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (const name of MOCKUPS) {
      const file = 'file://' + path.join(root, name + '.html');
      for (const dev of DEVICES) {
        const page = await browser.newPage();
        await page.setViewport({ width: dev.width, height: dev.height, deviceScaleFactor: dev.dsf, isMobile: dev.mobile, hasTouch: dev.mobile });
        await page.goto(file, { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 300));
        const out = path.join(outDir, `${name}-${dev.suffix}.png`);
        await page.screenshot({ path: out, fullPage: true });
        console.log('written', out);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
