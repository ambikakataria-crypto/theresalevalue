#!/usr/bin/env node
// Structural check for src/data/models/*.json. Run after
// refresh-model-pricing.mjs (or any manual edit) and before committing —
// catches schema drift, missing calculator coverage, and bad cross-links
// that a build success alone won't surface.
//
// Only checks files not in PRE_EXISTING against the lean schema: those four
// were hand-authored before this content set existed and carry extra fields
// (recentTransactions, heroImage, etc.) the page template doesn't render.
// They're still checked for valid JSON and permutation/curve consistency.
//
// Usage: node scripts/validate-model-data.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIR = path.join(ROOT, 'src/data/models');
const TOP50_PATH = path.join(ROOT, 'src/data/top50-models.ts');
const PRE_EXISTING = new Set(['maruti-swift', 'hyundai-creta', 'tata-nexon', 'toyota-innova-crysta']);

const REQUIRED_KEYS = [
  'slug', 'make', 'model', 'segment', 'bodyType', 'lastRefreshedISO', 'refreshCadence',
  'variants', 'permutations', 'cityVariance', 'retentionCurve', 'segmentAverageRetention',
  'context', 'faq', 'relatedModels'
].sort();

const YEARS = [2024, 2023, 2022, 2021, 2020];
const KM_BANDS = ['0-10k', '10-25k', '25-50k', '50-75k', '75k+'];
const CITIES = ['Delhi NCR', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];

const top50Src = fs.readFileSync(TOP50_PATH, 'utf8');
const validSlugs = new Set(
  [...top50Src.matchAll(/makeSlug: '([^']+)',\s*modelSlug: '([^']+)'/g)]
    .map(m => `${m[1]}/${m[2]}`)
);

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
const errors = [];

for (const file of files) {
  const base = file.replace('.json', '');
  const isNew = !PRE_EXISTING.has(base);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  } catch (e) {
    errors.push(`${file}: INVALID JSON — ${e.message}`);
    continue;
  }

  if (isNew) {
    const keys = Object.keys(data).sort();
    const missing = REQUIRED_KEYS.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !REQUIRED_KEYS.includes(k));
    if (missing.length) errors.push(`${file}: missing keys: ${missing.join(', ')}`);
    if (extra.length) errors.push(`${file}: extra keys not in lean schema: ${extra.join(', ')}`);

    if (data.slug) {
      if (`${data.slug.make}-${data.slug.model}` !== base) {
        errors.push(`${file}: slug doesn't match filename`);
      }
      if (!validSlugs.has(`${data.slug.make}/${data.slug.model}`)) {
        errors.push(`${file}: slug ${data.slug.make}/${data.slug.model} not in top50-models.ts`);
      }
    }
  }

  if (!Array.isArray(data.variants) || data.variants.length < 3 || data.variants.length > 10) {
    errors.push(`${file}: variants count out of range (${data.variants?.length})`);
  }
  const fuelsUsed = new Set((data.variants || []).map(v => v.fuel));
  for (const v of data.variants || []) {
    if (!v.name || !v.fuel || !v.transmission || typeof v.exShowroom !== 'number') {
      errors.push(`${file}: malformed variant ${JSON.stringify(v)}`);
    }
  }

  const expectedCombos = new Set();
  for (const y of YEARS) for (const k of KM_BANDS) for (const f of fuelsUsed) expectedCombos.add(`${y}|${k}|${f}`);
  const seenCombos = new Set();
  for (const p of data.permutations || []) {
    const key = `${p.year}|${p.kmBand}|${p.fuel}`;
    if (seenCombos.has(key)) errors.push(`${file}: duplicate permutation ${key}`);
    seenCombos.add(key);
    if (!(p.low < p.mid && p.mid < p.high)) {
      errors.push(`${file}: permutation ${key} fails low<mid<high (${p.low}/${p.mid}/${p.high})`);
    }
  }
  const missingCombos = [...expectedCombos].filter(c => !seenCombos.has(c));
  if (missingCombos.length) errors.push(`${file}: missing ${missingCombos.length} permutation combos, e.g. ${missingCombos.slice(0, 3).join(' | ')}`);

  if (isNew) {
    const citiesInFile = (data.cityVariance || []).map(c => c.city);
    if (citiesInFile.length !== 8) errors.push(`${file}: cityVariance has ${citiesInFile.length} entries, expected 8`);
    const missingCities = CITIES.filter(c => !citiesInFile.includes(c));
    if (missingCities.length) errors.push(`${file}: cityVariance missing: ${missingCities.join(', ')}`);
  }

  const curve = data.retentionCurve || [];
  if (curve.length !== 20) errors.push(`${file}: retentionCurve has ${curve.length} points, expected 20`);
  const expectedAges = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5);
  if (JSON.stringify(curve.map(c => c.ageYears)) !== JSON.stringify(expectedAges)) {
    errors.push(`${file}: retentionCurve ages don't match expected 0.5..10 sequence`);
  }
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].retentionPct > curve[i - 1].retentionPct) {
      errors.push(`${file}: retentionCurve not monotonic at age ${curve[i].ageYears}`);
      break;
    }
  }

  if (isNew) {
    if (!Array.isArray(data.context) || data.context.length < 3) errors.push(`${file}: context has ${data.context?.length} paragraphs, expected >=3`);
    if (!Array.isArray(data.faq) || data.faq.length !== 5) errors.push(`${file}: faq has ${data.faq?.length} entries, expected 5`);
    if (!Array.isArray(data.relatedModels) || data.relatedModels.length !== 3) {
      errors.push(`${file}: relatedModels has ${data.relatedModels?.length} entries, expected 3`);
    } else {
      const relSet = new Set();
      for (const r of data.relatedModels) {
        const key = `${r.make}/${r.model}`;
        if (key === `${data.slug?.make}/${data.slug?.model}`) errors.push(`${file}: relatedModels self-references itself`);
        if (!validSlugs.has(key)) errors.push(`${file}: relatedModels entry ${key} is not a valid slug pair`);
        relSet.add(key);
      }
      if (relSet.size !== data.relatedModels.length) errors.push(`${file}: relatedModels has duplicate entries`);
    }
  }
}

console.log(`Checked ${files.length} files (${files.length - PRE_EXISTING.size} lean-schema, ${PRE_EXISTING.size} legacy-schema)`);
console.log(`\n=== ERRORS (${errors.length}) ===`);
errors.forEach(e => console.log('  ' + e));
if (errors.length) process.exit(1);
