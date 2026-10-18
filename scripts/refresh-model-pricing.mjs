#!/usr/bin/env node
// Refreshes real ex-showroom pricing on src/data/models/*.json from the Cars24
// vehicle-service catalogue (variant-fuel-list). Intended to run monthly,
// matching the "Data refreshed ... Monthly" claim shown on each model page.
//
// What it touches, per file: `variants`, `permutations`, `lastRefreshedISO`.
// What it never touches: context, faq, cityVariance, retentionCurve,
// segmentAverageRetention, relatedModels — there is no API for any of that,
// so it stays hand-written/editorial and this script must not silently
// rewrite it.
//
// Also updates `exShowroomFrom` in src/data/top50-models.ts for any model it
// successfully refreshes, so the listing-page cards stay in sync.
//
// Usage:
//   node scripts/refresh-model-pricing.mjs
// Needs PUBLIC_C24_VEHICLE_AUTH, read from .env in the repo root (same var
// the app itself uses for the registration-number lookup and variant pricing).
//
// A model with no priced catalogue data (ultra-luxury imports, very recent
// launches) is left untouched and reported separately — that's expected, not
// a failure. Run scripts/validate-model-data.mjs after this to confirm every
// file is still structurally sound before committing.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MODELS_DIR = path.join(ROOT, 'src/data/models');
const TOP50_PATH = path.join(ROOT, 'src/data/top50-models.ts');
const ENV_PATH = path.join(ROOT, '.env');
const VFL = 'https://vehicle-service-stage.qac24svc.dev/variant-fuel-list';

const envMatch = fs.readFileSync(ENV_PATH, 'utf8').match(/PUBLIC_C24_VEHICLE_AUTH="([^"]+)"/);
if (!envMatch) {
  console.error('PUBLIC_C24_VEHICLE_AUTH not found in .env — see .env.example.');
  process.exit(1);
}
const AUTH = envMatch[1];

// slug -> Cars24 catalogue model_id. Resolved once via make_screen/model_screen
// on api.cars24.com; update here if a model is renamed/re-catalogued upstream,
// or if a currently-unresolved model (see UNRESOLVED below) gets ingested.
const MODEL_ID = {
  'mahindra/thar': 128, 'maruti/brezza': 635, 'tata/harrier': 455,
  'maruti/dzire': 348, 'maruti/alto-k10': 330, 'mahindra/bolero': 123, 'maruti/fronx': 655,
  'hyundai/verna': 102, 'maruti/wagon-r': 149, 'hyundai/venue': 462, 'mahindra/scorpio-n': 642,
  'mahindra/scorpio': 638, 'kia/seltos': 483, 'hyundai/i20': 96, 'land-rover/range-rover': 119,
  'renault/kiger': 587, 'hyundai/aura': 495, 'tata/altroz': 494, 'hyundai/grand-i10-nios': 487,
  'kia/sonet': 511, 'land-rover/defender': 626, 'tata/punch': 607, 'honda/city': 83,
  'honda/amaze': 81, 'renault/triber': 477, 'mg/hector': 475, 'maruti/jimny': 659,
  'kia/carens': 615, 'mercedes-benz/g-class': 164, 'toyota/hyryder': 643, 'toyota/camry': 239,
  'hyundai/alcazar': 598, 'toyota/glanza': 468, 'mercedes-benz/e-class': 163,
  'toyota/land-cruiser-300': 245, 'nissan/magnite': 574, 'maruti/s-presso': 485,
  'hyundai/exter': 661, 'toyota/innova-hycross': 647, 'toyota/hilux': 619,
  'mahindra/bolero-neo': 602, 'jeep/compass': 364, 'volkswagen/virtus': 634,
  'tata/sierra': 313, 'tata/tiago': 336, 'toyota/fortuner': 243,
  'maruti/swift': 146, 'hyundai/creta': 320, 'tata/nexon': 359, 'toyota/innova-crysta': 339,
};

const YEAR_MULT = { 2024: 1.00, 2023: 0.875, 2022: 0.797, 2021: 0.703, 2020: 0.625 };
const KM_MULT = { '0-10k': 1.00, '10-25k': 0.961, '25-50k': 0.906, '50-75k': 0.844, '75k+': 0.781 };
const YEARS = [2024, 2023, 2022, 2021, 2020];
const KM_BANDS = ['0-10k', '10-25k', '25-50k', '50-75k', '75k+'];

function curlJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const out = execFileSync('curl', ['-s', '-m', '60', url, '-H', `x_basic_a: ${AUTH}`], { encoding: 'utf8' });
      return JSON.parse(out);
    } catch { /* retry */ }
  }
  return null;
}

function fetchRealVariants(modelId) {
  const currentYear = new Date().getFullYear();
  for (const year of [currentYear, currentYear - 1, currentYear - 2]) {
    const body = curlJson(`${VFL}?modelId=${modelId}&year=${year}`);
    if (!body || body.status === '404' || !body.detail) continue;
    const all = [];
    for (const [fuel, groups] of Object.entries(body.detail)) {
      for (const g of groups) {
        for (const v of g.variants || []) {
          if (!v.ex_showroom_price) continue;
          all.push({
            name: (v.variant_display_name || v.variant_name).replace(/\s+/g, ' ').trim(),
            fuel: v.fuel_type || fuel,
            transmission: v.transmission_type || 'MT',
            exShowroom: Math.round((v.ex_showroom_price / 100000) * 100) / 100,
          });
        }
      }
    }
    if (all.length >= 3) return { year, variants: all };
  }
  return null;
}

// Representative subset per fuel group, capped so the page's variant table
// stays a lineup overview rather than a dump of every colour/trim SKU.
function selectRepresentative(variants, capTotal = 10) {
  const byFuel = {};
  for (const v of variants) (byFuel[v.fuel] ??= []).push(v);
  for (const f in byFuel) byFuel[f].sort((a, b) => a.exShowroom - b.exShowroom);

  const fuels = Object.keys(byFuel);
  const perFuel = Math.max(2, Math.floor(capTotal / fuels.length));
  const out = [];
  for (const f of fuels) {
    const list = byFuel[f];
    if (list.length <= perFuel) { out.push(...list); continue; }
    const idxs = new Set([0, list.length - 1]);
    for (let i = 1; i < perFuel - 1; i++) idxs.add(Math.round((i * (list.length - 1)) / (perFuel - 1)));
    out.push(...[...idxs].sort((a, b) => a - b).map(i => list[i]));
  }
  return out;
}

function buildPermutations(variants) {
  const byFuel = {};
  for (const v of variants) (byFuel[v.fuel] ??= []).push(v.exShowroom);
  const rows = [];
  for (const [fuel, prices] of Object.entries(byFuel)) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    for (const year of YEARS) {
      for (const kmBand of KM_BANDS) {
        const mid = avg * 0.90 * YEAR_MULT[year] * KM_MULT[kmBand];
        rows.push({
          year, kmBand, fuel,
          low: Math.round(mid * 0.93 * 100) / 100,
          mid: Math.round(mid * 100) / 100,
          high: Math.round(mid * 1.07 * 100) / 100,
        });
      }
    }
  }
  return rows;
}

const today = new Date().toISOString().slice(0, 10);
const results = { refreshed: [], keptEstimate: [], noFile: [] };

for (const [slugKey, modelId] of Object.entries(MODEL_ID)) {
  const [makeSlug, modelSlug] = slugKey.split('/');
  const file = path.join(MODELS_DIR, `${makeSlug}-${modelSlug}.json`);
  if (!fs.existsSync(file)) { results.noFile.push(slugKey); continue; }

  const real = fetchRealVariants(modelId);
  if (!real) { results.keptEstimate.push(slugKey); continue; }

  const selected = selectRepresentative(real.variants);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.variants = selected;
  data.permutations = buildPermutations(selected);
  data.lastRefreshedISO = today;
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');

  const lowest = Math.min(...selected.map(v => v.exShowroom));
  results.refreshed.push({ slugKey, variantCount: selected.length, realTotal: real.variants.length, lowest });
  process.stderr.write(`refreshed ${slugKey}: ${selected.length}/${real.variants.length} priced variants, from ${lowest}L\n`);
}

// Sync exShowroomFrom in top50-models.ts for everything just refreshed.
let top50 = fs.readFileSync(TOP50_PATH, 'utf8');
for (const r of results.refreshed) {
  const [makeSlug, modelSlug] = r.slugKey.split('/');
  const re = new RegExp(`(makeSlug: '${makeSlug}',\\s*modelSlug: '${modelSlug}',\\s*segment: '[^']+',\\s*exShowroomFrom: )([0-9.]+)`);
  top50 = top50.replace(re, (_, pre) => pre + r.lowest);
}
fs.writeFileSync(TOP50_PATH, top50);

console.log(`\n=== REFRESHED (${results.refreshed.length}) ===`);
results.refreshed.forEach(r => console.log(`  ${r.slugKey}: ${r.variantCount} variants (of ${r.realTotal} priced), from ${r.lowest}L`));
console.log(`\n=== KEPT ESTIMATE — no priced catalogue data (${results.keptEstimate.length}) ===`);
results.keptEstimate.forEach(s => console.log('  ' + s));
if (results.noFile.length) {
  console.log(`\n=== NO FILE for these slugs — check MODEL_ID map (${results.noFile.length}) ===`);
  results.noFile.forEach(s => console.log('  ' + s));
}
console.log('\nNext: node scripts/validate-model-data.mjs, then npm run build, then review before committing.');
