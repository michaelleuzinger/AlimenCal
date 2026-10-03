#!/usr/bin/env node
/* Link- und Referenzpruefung fuer Repository-Hygiene (AGENTS.md).
 *
 * Prueft alle Markdown-Dateien und HTML-Dateien im Repository auf
 * interne Verweise (Links, Bild-Einbettungen, src/href) und meldet
 * alle Ziele, die im Arbeitsverzeichnis nicht existieren.
 *
 * Ausfuehren: node tools/check-links.js
 * Exit-Code 0 = alles in Ordnung, 1 = es gibt defekte Verweise.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = ['node_modules', '.git', 'screenshots'];
const MD_GLOB = /\.(md|html)$/;

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.includes(entry.name)) { continue; }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full, files); }
    else if (MD_GLOB.test(entry.name)) { files.push(full); }
  }
  return files;
}

function refsOf(file) {
  const s = fs.readFileSync(file, 'utf8');
  const out = [];
  let m;
  const mdLink = /\]\((?!https?:|#|mailto:)([^)\s]+)\)/g;
  while ((m = mdLink.exec(s))) { out.push(m[1]); }
  const attr = /(?:src|href)="(?!https?:|#|mailto:)([^"]+)"/g;
  while ((m = attr.exec(s))) { out.push(m[1]); }
  return out;
}

const broken = [];
for (const file of walk(ROOT, [])) {
  for (const ref of refsOf(file)) {
    const target = path.resolve(path.dirname(file), decodeURIComponent(ref));
    if (!fs.existsSync(target)) {
      broken.push(path.relative(ROOT, file) + ' -> ' + ref);
    }
  }
}

if (broken.length) {
  console.error('DEFEKTE VERWEISE (' + broken.length + '):');
  broken.forEach(b => console.error('  ' + b));
  process.exit(1);
}
console.log('Links ok: keine defekten Verweise gefunden.');
