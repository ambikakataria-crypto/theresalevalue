import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchVariants, fetchVariantsWithPrice, fetchDepreciationTable, type Variant } from '../lib/cars24';

/**
 * Standalone new-car depreciation calculator.
 * Make + Model + City come from the same live catalogue used by the used-car
 * valuation form. Body-type is inferred silently from ex-showroom price so
 * the user only sees inputs they actually own the answer to.
 * Output: 10-year value curve scaled to the user's ex-showroom.
 */

interface ScreenItem {
  id: string;
  title: string;
  logoUrl: string;
}

interface CityItem {
  id: string;
  slug: string;
  name: string;
  stateId?: string;
  stateCode?: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

type Segment =
  | 'hatchback'
  | 'sedan'
  | 'compact-suv'
  | 'midsize-suv'
  | 'large-suv'
  | 'mpv'
  | 'luxury';

type Fuel = 'petrol' | 'diesel' | 'cng' | 'hybrid' | 'ev';

type CityTier = 'metro' | 'tier1' | 'tier2';

// Base retention % at year 0..10 by segment. Calibrated to Indian resale patterns.
const BASE_CURVE: Record<Segment, number[]> = {
  'hatchback':    [100, 85, 74, 65, 57, 50, 44, 38, 33, 29, 25],
  'sedan':        [100, 82, 70, 60, 52, 45, 39, 33, 28, 24, 20],
  'compact-suv':  [100, 87, 78, 70, 62, 55, 48, 42, 36, 31, 27],
  'midsize-suv':  [100, 86, 76, 68, 60, 53, 46, 40, 34, 29, 25],
  'large-suv':    [100, 84, 73, 63, 55, 47, 40, 34, 28, 24, 20],
  'mpv':          [100, 88, 79, 71, 63, 56, 49, 43, 37, 32, 28],
  'luxury':       [100, 78, 65, 54, 45, 37, 30, 24, 19, 15, 12],
};

// Compounding multiplier applied per year from year 1 onwards.
const FUEL_MULT: Record<Fuel, number> = {
  petrol: 1.000,
  diesel: 0.990,
  cng:    0.995,
  hybrid: 1.005,
  ev:     0.965,
};

// City tier applies a light multiplier from Y3 onwards.
const CITY_MULT: Record<CityTier, number> = {
  metro:  0.985,
  tier1:  1.000,
  tier2:  1.010,
};

const FUEL_LABEL: Record<Fuel, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng:    'CNG',
  hybrid: 'Strong Hybrid',
  ev:     'Electric (BEV)',
};

// Maps the catalogue's fuel-group name (from variant-fuel-list) to our Fuel
// enum, so picking a variant keeps the Fuel selector in sync with it rather
// than leaving a stale, contradictory choice sitting next to a real variant.
function mapApiFuel(apiFuel: string): Fuel | null {
  const key = apiFuel.trim().toLowerCase();
  if (key === 'petrol') return 'petrol';
  if (key === 'diesel') return 'diesel';
  if (key === 'cng' || key === 'lpg') return 'cng';
  if (key === 'electric' || key === 'ev') return 'ev';
  if (key.includes('hybrid')) return 'hybrid';
  return null;
}

// Metro + Tier 1 city name lookups. Everything else falls to Tier 2.
const METRO_CITIES = new Set([
  'delhi', 'new delhi', 'delhi ncr', 'gurgaon', 'gurugram', 'noida', 'ghaziabad', 'faridabad',
  'mumbai', 'navi mumbai', 'thane',
  'bengaluru', 'bangalore',
  'chennai',
  'hyderabad', 'secunderabad',
  'kolkata',
  'pune',
]);

const TIER1_CITIES = new Set([
  'ahmedabad', 'jaipur', 'chandigarh', 'lucknow', 'kochi', 'coimbatore', 'indore', 'bhopal',
  'nagpur', 'vadodara', 'surat', 'visakhapatnam', 'vijayawada', 'kanpur', 'nashik',
  'mysore', 'mysuru', 'trivandrum', 'thiruvananthapuram', 'mangalore', 'mangaluru',
  'ludhiana', 'amritsar', 'rajkot', 'patna', 'ranchi', 'bhubaneswar', 'guwahati', 'dehradun',
]);

function tierFor(cityName: string): CityTier {
  const key = cityName.trim().toLowerCase();
  if (METRO_CITIES.has(key)) return 'metro';
  if (TIER1_CITIES.has(key)) return 'tier1';
  return 'tier2';
}

// Silent segment inference from ex-showroom price. Keeps the form simple while
// preserving segment-accurate retention curves under the hood.
function inferSegment(exShowroom: number): Segment {
  if (exShowroom <= 7)   return 'hatchback';
  if (exShowroom <= 12)  return 'compact-suv';
  if (exShowroom <= 20)  return 'midsize-suv';
  if (exShowroom <= 35)  return 'large-suv';
  return 'luxury';
}

function fmtInr(lakh: number): string {
  if (lakh >= 100) return `₹${(lakh / 100).toFixed(2)}Cr`;
  return `₹${lakh.toFixed(2)}L`;
}

function computeCurve(exShowroom: number, fuel: Fuel, city: CityTier): number[] {
  const segment = inferSegment(exShowroom);
  const base = BASE_CURVE[segment];
  const fMult = FUEL_MULT[fuel];
  const cMult = CITY_MULT[city];
  return base.map((pct, y) => {
    if (y === 0) return exShowroom;
    const fCompound = Math.pow(fMult, y);
    const cCompound = y >= 3 ? Math.pow(cMult, y - 2) : 1;
    return exShowroom * (pct / 100) * fCompound * cCompound;
  });
}

// The model only reports depreciation for a car it can price, and returns
// buckets up to the queried car's age — so ask about a 9-year-old one to get
// the whole {1,3,5,7,9} table in a single call. 12,000 km/yr matches the usage
// assumption stated under the chart.
const DEP_PROBE_AGE = 9;
const KMS_PER_YEAR = 12000;

// A variant too new to be priced at DEP_PROBE_AGE comes back with a short
// table, and carrying a young car's steep slope far past its last anchor
// understates the tail badly — a table ending at age 3 put a ₹7.5L car at
// ₹0.97L by year 10. Ending at age 5 is still close enough to use; shorter
// than that and the built-in segment curve is the better answer.
const MAX_EXTRAPOLATED_YEARS = 5;

/**
 * Turns the model's odd-year depreciation table into an 11-point value curve:
 * interpolate between anchors, then carry the closing slope out to year 10.
 * Returns null when too few anchors came back to draw a curve from.
 */
function curveFromDepTable(
  exShowroom: number,
  yearlyDep: Record<string, number>,
  city: CityTier,
): number[] | null {
  const anchors = Object.entries(yearlyDep)
    .map(([age, pct]) => [Number(age), 100 - pct] as [number, number])
    .filter(([age, retention]) => Number.isFinite(age) && Number.isFinite(retention))
    .sort((a, b) => a[0] - b[0]);
  if (anchors.length < 2) return null;
  if (anchors[anchors.length - 1][0] < 10 - MAX_EXTRAPOLATED_YEARS) return null;

  const points: [number, number][] = [[0, 100], ...anchors];
  const cMult = CITY_MULT[city];

  return Array.from({ length: 11 }, (_, age) => {
    if (age === 0) return exShowroom;

    const last = points[points.length - 1];
    let retention: number;
    if (age >= last[0]) {
      const prev = points[points.length - 2];
      const slope = (last[1] - prev[1]) / (last[0] - prev[0]);
      retention = last[1] + slope * (age - last[0]);
    } else {
      const upper = points.findIndex(([x]) => age <= x);
      const [x1, y1] = points[upper - 1];
      const [x2, y2] = points[upper];
      retention = y1 + ((age - x1) / (x2 - x1)) * (y2 - y1);
    }

    // Fuel is not re-applied here: the variant already encodes it, so the
    // model's own figure accounts for it. The city tier still is, on a
    // different axis — the model varies its early years by state (1-3pp), but
    // cannot tell a metro from a small town inside that same state.
    const cCompound = age >= 3 ? Math.pow(cMult, age - 2) : 1;
    return (exShowroom * Math.max(retention, 0) * cCompound) / 100;
  });
}

// Default preview state: Maruti Swift, ₹6.5L ex-showroom, petrol, All-India.
// Renders on first paint so the graph immediately shows a real Indian
// resale curve instead of a blank ₹0 chart. The moment the user changes
// any input, hasInteracted flips and the RHS switches to "Your new car".
const DEFAULT_PREVIEW = {
  makeLabel: 'Maruti',
  modelLabel: 'Swift',
  exShowroom: 6.5,
  fuel: 'petrol' as Fuel,
};

export default function NewCarDepreciationCalculator() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [mfgYear, setMfgYear] = useState<number>(new Date().getFullYear());
  const [exShowroom, setExShowroom] = useState<number>(DEFAULT_PREVIEW.exShowroom);
  const [fuel, setFuel] = useState<Fuel>(DEFAULT_PREVIEW.fuel);
  const [citySlug, setCitySlug] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const initialMount = useRef(true);

  // Flip hasInteracted the first time any input changes past initial mount.
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    setHasInteracted(true);
  }, [make, model, variant, mfgYear, exShowroom, fuel, citySlug]);

  // Year picker: allow current year and 4 back (used but very lightly aged buys).
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const [makes, setMakes] = useState<ScreenItem[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [models, setModels] = useState<ScreenItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  // Load makes + cities on mount.
  useEffect(() => {
    fetch('/api/makes.json')
      .then((res) => res.json())
      .then((data: ScreenItem[]) => setMakes(Array.isArray(data) ? data : []))
      .catch(() => setMakes([]))
      .finally(() => setMakesLoading(false));

    fetch('/api/cities.json')
      .then((res) => res.json())
      .then((data: unknown) => setCities(Array.isArray(data) ? (data as CityItem[]) : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);

  const selectedMake = makes.find((m) => slugify(m.title) === make);

  // Load models when make changes.
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    fetch(`/api/models/${selectedMake.id}.json`)
      .then((res) => res.json())
      .then((data: ScreenItem[]) => { if (!cancelled) setModels(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setModels([]); })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMake?.id]);

  const selectedModel = models.find((m) => slugify(m.title) === model);
  const selectedCity = cities.find((c) => c.slug === citySlug);
  const cityTier: CityTier = selectedCity ? tierFor(selectedCity.name) : 'tier1';

  // Variants (with ex-showroom price) for the chosen model + year. Falls back
  // to the price-less mmv list if variant-fuel-list has no data for this
  // model/year, so the dropdown still populates even without pricing.
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  useEffect(() => {
    if (!selectedMake || !selectedModel) {
      setVariants([]);
      return;
    }
    let cancelled = false;
    setVariantsLoading(true);
    fetchVariantsWithPrice(selectedModel.id, String(mfgYear))
      .catch(() => fetchVariants(selectedMake.id, selectedModel.id, String(mfgYear)))
      .then((data) => { if (!cancelled) setVariants(data); })
      .catch(() => { if (!cancelled) setVariants([]); })
      .finally(() => { if (!cancelled) setVariantsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMake?.id, selectedModel?.id, mfgYear]);

  const selectedVariant = variants.find((v) => v.id === variant);
  // The fallback mmv list carries no prices, so the copy below must not promise
  // an auto-filled ex-showroom the user is never going to see.
  const variantsHavePrice = variants.some((v) => v.exShowroomPrice);

  // Picking a variant sets its real ex-showroom price and fuel type, rather
  // than leaving those as guesses next to a specific, known trim.
  useEffect(() => {
    if (!selectedVariant) return;
    if (selectedVariant.exShowroomPrice) {
      setExShowroom(Math.round((selectedVariant.exShowroomPrice / 100000) * 10) / 10);
    }
    const mappedFuel = mapApiFuel(selectedVariant.fuelType);
    if (mappedFuel) setFuel(mappedFuel);
  }, [selectedVariant?.id]);

  // Real depreciation for the chosen trim, from the pricing model. Only a
  // priced variant can be looked up, and any failure simply leaves the
  // built-in segment benchmarks in charge.
  const [depTable, setDepTable] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!selectedVariant?.exShowroomPrice) {
      setDepTable(null);
      return;
    }
    let cancelled = false;
    fetchDepreciationTable({
      variantId: selectedVariant.id,
      year: currentYear - DEP_PROBE_AGE,
      exShowroomPrice: selectedVariant.exShowroomPrice,
      kms: DEP_PROBE_AGE * KMS_PER_YEAR,
      stateId: selectedCity ? Number(selectedCity.stateId) : undefined,
    })
      .then((yearlyDep) => { if (!cancelled) setDepTable(yearlyDep); })
      .catch(() => { if (!cancelled) setDepTable(null); });
    return () => { cancelled = true; };
  }, [selectedVariant?.id, selectedCity?.id]);

  const { curve, modelDerived } = useMemo(() => {
    if (depTable) {
      const fromModel = curveFromDepTable(exShowroom, depTable, cityTier);
      if (fromModel) return { curve: fromModel, modelDerived: true };
    }
    return { curve: computeCurve(exShowroom, fuel, cityTier), modelDerived: false };
  }, [exShowroom, fuel, cityTier, depTable]);

  const y5Retention = Math.round((curve[5] / curve[0]) * 100);
  const y10Retention = Math.round((curve[10] / curve[0]) * 100);
  const y5Loss = curve[0] - curve[5];
  const y10Loss = curve[0] - curve[10];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
  };

  // Chart geometry
  const chartW = 560;
  const chartH = 300;
  const padL = 52;
  const padR = 20;
  const padT = 24;
  const padB = 44;
  const yTop = Math.ceil(curve[0]);
  const yBot = 0;
  const years = Array.from({ length: 11 }, (_, i) => i);
  const x = (i: number) => padL + (i / 10) * (chartW - padL - padR);
  const y = (v: number) => padT + (1 - (v - yBot) / (yTop - yBot)) * (chartH - padT - padB);
  const linePath = curve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const areaPath = `${linePath} L ${x(10)} ${chartH - padB} L ${x(0)} ${chartH - padB} Z`;
  const yTicks = [yTop, yTop * 0.75, yTop * 0.5, yTop * 0.25, 0];

  return (
    <div className="grid lg:grid-cols-12 gap-8 items-start">
      {/* LEFT: form */}
      <form onSubmit={handleSubmit} className="lg:col-span-5 card-institutional bg-white">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Free · 30 seconds · No signup</div>
        <h2 className="text-2xl font-serif text-navy-900 mb-6">Tell us about the new car</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">Make</label>
            <select
              required
              value={make}
              onChange={(e) => { setMake(e.target.value); setModel(''); setVariant(''); }}
              disabled={makesLoading}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
            >
              <option value="">{makesLoading ? 'Loading makes…' : 'Select make'}</option>
              {makes.map((m) => (
                <option key={m.id} value={slugify(m.title)}>{m.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">Model</label>
            <select
              required
              value={model}
              onChange={(e) => { setModel(e.target.value); setVariant(''); }}
              disabled={!make || modelsLoading}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
            >
              <option value="">{modelsLoading ? 'Loading models…' : 'Select model'}</option>
              {models.map((m) => (
                <option key={m.id} value={slugify(m.title)}>{m.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">Variant</label>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              disabled={!selectedModel || variantsLoading}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {!selectedModel
                  ? 'Select a model first'
                  : variantsLoading
                    ? 'Loading variants…'
                    : variants.length > 0
                      ? 'Select variant'
                      : 'No variants listed for this year'}
              </option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}{v.exShowroomPrice ? ` · ${fmtInr(v.exShowroomPrice / 100000)}` : ''}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-soft mt-1">
              {!selectedModel
                ? 'Optional — pick a make and model to list trims.'
                : variantsLoading
                  ? 'Fetching trims for this model and year…'
                  : variants.length === 0
                    ? 'No catalogue trims for this year — enter ex-showroom price manually below.'
                    : variantsHavePrice
                      ? 'Picking a variant fills its real ex-showroom price and fuel type below.'
                      : 'Prices are unavailable for this year — enter ex-showroom price manually below.'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">
              Year of manufacture
            </label>
            <select
              required
              value={mfgYear}
              onChange={(e) => { setMfgYear(Number(e.target.value)); setVariant(''); }}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">
              Ex-showroom price (₹ lakh)
            </label>
            <input
              type="number"
              required
              step="0.1"
              min="0.5"
              value={exShowroom}
              onChange={(e) => setExShowroom(Number(e.target.value))}
              placeholder="e.g. 8.5"
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm font-data focus:border-navy-900 focus:outline-none"
            />
            <div className="text-xs text-slate-soft mt-1">
              {selectedVariant?.exShowroomPrice
                ? 'Filled from the catalogue for this variant — edit if your quote differs.'
                : 'On-road adds ~10-15% but resale is anchored to ex-showroom.'}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">Fuel type</label>
            <select
              required
              value={fuel}
              onChange={(e) => setFuel(e.target.value as Fuel)}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
            >
              {(Object.keys(FUEL_LABEL) as Fuel[]).map((f) => (
                <option key={f} value={f}>{FUEL_LABEL[f]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">City</label>
            <select
              required
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
              disabled={citiesLoading}
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {citiesLoading ? 'Loading cities…' : cities.length > 0 ? 'Select city' : 'City list unavailable'}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="mt-6 w-full py-3 bg-navy-900 !text-white font-medium rounded-md hover:bg-navy-800 transition-colors"
        >
          Show 10-year depreciation curve →
        </button>

        {submitted && (
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full py-2 bg-white border border-cream-200 !text-navy-900 text-sm font-medium rounded-md hover:border-navy-900 transition-colors"
          >
            Reset
          </button>
        )}

        <p className="mt-4 text-xs text-slate-soft leading-relaxed">
          We do not ask for name, phone, or email. Read our <a href="/methodology">methodology</a>.
        </p>
      </form>

      {/* RIGHT: 10-year curve output */}
      <div className="lg:col-span-7 card-institutional bg-white">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-soft mb-1">10-year forecast</div>
            <div className="text-xl font-serif text-navy-900">
              {hasInteracted
                ? `${selectedMake?.title || 'Your'} ${selectedModel?.title || 'new car'}${selectedVariant ? ` ${selectedVariant.title}` : ''}`
                : `${DEFAULT_PREVIEW.makeLabel} ${DEFAULT_PREVIEW.modelLabel}`}
            </div>
            <div className="text-sm text-graphite mt-1">
              Ex-showroom <span className="font-data text-navy-900">{fmtInr(exShowroom)}</span>
              {' · '}{FUEL_LABEL[fuel]}
              {hasInteracted
                ? (selectedCity && ` · ${selectedCity.name}`)
                : ' · All-India'}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-signal-500/10 text-signal-600 font-semibold self-start">
            {!hasInteracted ? 'Example' : modelDerived ? 'Model-derived' : 'Live estimate'}
          </span>
        </div>

        {!hasInteracted && (
          <div className="text-xs text-graphite bg-cream-100 border border-cream-200 rounded-md px-3 py-2 mb-4 leading-relaxed">
            <strong className="text-navy-900">Example curve.</strong> Change any input on the left to see your own car's 10-year forecast.
          </div>
        )}

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-auto"
          role="img"
          aria-label="10-year depreciation curve"
        >
          <defs>
            <linearGradient id="grad-newcar-curve" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A2540" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0A2540" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((t, idx) => (
            <g key={`tick-${idx}`}>
              <line x1={padL} y1={y(t)} x2={chartW - padR} y2={y(t)} stroke="#E8E6DE" strokeWidth={1} />
              <text
                x={padL - 8}
                y={y(t) + 3}
                textAnchor="end"
                fontSize={10}
                fill="#6B7280"
                fontFamily="'JetBrains Mono', monospace"
              >
                ₹{t.toFixed(t >= 10 ? 0 : 1)}L
              </text>
            </g>
          ))}

          <path d={areaPath} fill="url(#grad-newcar-curve)" />
          <path
            d={linePath}
            fill="none"
            stroke="#0A2540"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {curve.map((v, i) => (
            <circle
              key={`dot-${i}`}
              cx={x(i)}
              cy={y(v)}
              r={i === 5 || i === 10 ? 5 : 3}
              fill={i === 5 || i === 10 ? '#10B981' : '#0A2540'}
              stroke="white"
              strokeWidth={i === 5 || i === 10 ? 2 : 1.5}
            />
          ))}

          <text
            x={x(5)}
            y={y(curve[5]) - 12}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="#0A2540"
            fontFamily="'JetBrains Mono', monospace"
          >
            {mfgYear + 5}: {fmtInr(curve[5])}
          </text>
          <text
            x={x(10) - 4}
            y={y(curve[10]) - 12}
            textAnchor="end"
            fontSize={11}
            fontWeight={600}
            fill="#0A2540"
            fontFamily="'JetBrains Mono', monospace"
          >
            {mfgYear + 10}: {fmtInr(curve[10])}
          </text>

          {years.map((yr) => (
            <text
              key={`x-${yr}`}
              x={x(yr)}
              y={chartH - padB + 18}
              textAnchor="middle"
              fontSize={10}
              fill="#6B7280"
              fontFamily="'Inter', sans-serif"
            >
              {mfgYear + yr}
            </text>
          ))}
        </svg>

        {/* Retention summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 mt-3 border-t border-cream-200 text-sm">
          <div>
            <div className="text-[10px] uppercase text-slate-soft mb-1">{mfgYear + 5} value</div>
            <div className="font-data text-navy-900 font-semibold">{fmtInr(curve[5])}</div>
            <div className="text-[11px] text-slate-soft mt-0.5">{y5Retention}% retained</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-soft mb-1">{mfgYear + 10} value</div>
            <div className="font-data text-navy-900 font-semibold">{fmtInr(curve[10])}</div>
            <div className="text-[11px] text-slate-soft mt-0.5">{y10Retention}% retained</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-soft mb-1">5-year loss</div>
            <div className="font-data text-caution-600 font-semibold">{fmtInr(y5Loss)}</div>
            <div className="text-[11px] text-slate-soft mt-0.5">{fmtInr(y5Loss / 5)}/yr</div>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-soft mb-1">10-year loss</div>
            <div className="font-data text-caution-600 font-semibold">{fmtInr(y10Loss)}</div>
            <div className="text-[11px] text-slate-soft mt-0.5">{fmtInr(y10Loss / 10)}/yr</div>
          </div>
        </div>

        {/* Year table */}
        <details className="mt-5 border-t border-cream-200 pt-4">
          <summary className="text-sm font-medium text-navy-900 cursor-pointer">
            Show year-by-year table
          </summary>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-slate-soft">
                  <th className="py-2 pr-4">Year</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2 pr-4">Retained</th>
                  <th className="py-2">Lost so far</th>
                </tr>
              </thead>
              <tbody className="font-data text-navy-900">
                {curve.map((v, i) => (
                  <tr key={i} className="border-t border-cream-200">
                    <td className="py-2 pr-4">{mfgYear + i}{i === 0 ? ' (new)' : ''}</td>
                    <td className="py-2 pr-4">{fmtInr(v)}</td>
                    <td className="py-2 pr-4">{Math.round((v / curve[0]) * 100)}%</td>
                    <td className="py-2 text-caution-600">{fmtInr(curve[0] - v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <p className="text-xs text-slate-soft mt-4 leading-relaxed">
          {modelDerived
            ? 'Curve comes from the Cars24 pricing model for this exact variant, interpolated between the ages it reports and adjusted for city.'
            : 'Curve is calibrated to Indian resale patterns using segment-level retention benchmarks, adjusted for fuel type and city.'}
          {' '}Assumes average annual usage (~12,000 km/yr), average condition, and no accident history.
          For a model-specific forecast with variant-level detail, open the report from the top 50 list below.
        </p>
      </div>
    </div>
  );
}
