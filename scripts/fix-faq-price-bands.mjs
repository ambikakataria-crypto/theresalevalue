#!/usr/bin/env node
// One-off/rerunnable fixer for a specific defect class: FAQ answers that cite
// a "For a {year} {trim} {fuel} with {km} km, ... fair-market band ₹X–Y lakh"
// sentence whose rupee figures no longer match this file's own `permutations`
// data. This happens whenever permutations gets regenerated (e.g. by
// refresh-model-pricing.mjs) without the editorial FAQ text being re-synced.
//
// Ground truth is always the file's own permutations array — this script
// never invents numbers, it only substitutes the cited rupee figures with
// the real row already present in the same file.
//
// Usage: node scripts/fix-faq-price-bands.mjs [--dry-run]

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'src/data/models');
const DRY = process.argv.includes('--dry-run');

const KM_BUCKETS = [
  { lo: 0, hi: 10000, band: '0-10k' },
  { lo: 10000, hi: 25000, band: '10-25k' },
  { lo: 25000, hi: 50000, band: '25-50k' },
  { lo: 50000, hi: 75000, band: '50-75k' },
];
const FUELS = ['Petrol', 'Diesel', 'CNG', 'Hybrid'];

const SENT_RE = /For a (\d{4}) ([^,]+?) with ([\d,]+)\s*(?:to|-|–)\s*([\d,]+) km, the current fair-market band is (?:roughly|approximately) (₹[\d.]+\s*(?:to|-|–)\s*₹?[\d.]+ lakh)\./g;

let totalChecked = 0, totalFixed = 0, totalUnmatched = 0;

for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.json'))) {
  const full = path.join(DIR, file);
  const raw = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.faq) || !Array.isArray(data.permutations)) continue;

  let changed = false;
  for (const entry of data.faq) {
    entry.a = entry.a.replace(SENT_RE, (full_, yearStr, trimText, kmLoStr, kmHiStr, priceText) => {
      totalChecked++;
      const year = Number(yearStr);
      const kmLo = Number(kmLoStr.replace(/,/g, ''));
      const kmHi = Number(kmHiStr.replace(/,/g, ''));
      const bucket = KM_BUCKETS.find(b => b.lo === kmLo && b.hi === kmHi);
      const fuel = FUELS.find(f => new RegExp(`\\b${f}\\b`, 'i').test(trimText));
      if (!bucket || !fuel) { totalUnmatched++; return full_; }

      const row = data.permutations.find(p => p.year === year && p.kmBand === bucket.band && p.fuel === fuel);
      if (!row) { totalUnmatched++; return full_; }

      const priceNums = priceText.match(/[\d.]+/g).map(Number);
      const [citedLo, citedHi] = [priceNums[0], priceNums[priceNums.length - 1]];
      const realLo = row.low, realHi = row.high;
      const closeEnough = Math.abs(realLo - Number(citedLo)) <= 0.15 && Math.abs(realHi - Number(citedHi)) <= 0.15;
      if (closeEnough) return full_;

      changed = true;
      totalFixed++;
      console.log(`${file}: ${year} ${fuel} ${bucket.band} — cited ₹${citedLo}–${citedHi}L, real ₹${realLo}–${realHi}L`);
      return full_.replace(priceText, `₹${realLo}–${realHi} lakh`);
    });
  }

  if (changed && !DRY) {
    fs.writeFileSync(full, JSON.stringify(data, null, 2) + '\n');
  }
}

console.log(`\nChecked ${totalChecked} price-band sentences. Fixed ${totalFixed}. Unmatched (couldn't resolve year/km/fuel to a permutation row) ${totalUnmatched}.`);
if (DRY) console.log('(dry run — no files written)');
