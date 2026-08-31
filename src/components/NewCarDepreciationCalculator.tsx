import { useEffect, useMemo, useRef, useState } from 'react';

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

  const curve = useMemo(
    () => computeCurve(exShowroom, fuel, cityTier),
    [exShowroom, fuel, cityTier],
  );

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
              onChange={(e) => { setMake(e.target.value); setModel(''); }}
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
              onChange={(e) => setModel(e.target.value)}
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
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="e.g. VXi, Alpha, Creative"
              className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
            />
            <div className="text-xs text-slate-soft mt-1">Enter trim as it appears on the RC or brochure.</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-900 mb-1.5">
              Year of manufacture
            </label>
            <select
              required
              value={mfgYear}
              onChange={(e) => setMfgYear(Number(e.target.value))}
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
            <div className="text-xs text-slate-soft mt-1">On-road adds ~10-15% but resale is anchored to ex-showroom.</div>
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
                ? `${selectedMake?.title || 'Your'} ${selectedModel?.title || 'new car'}${variant.trim() ? ` ${variant.trim()}` : ''}`
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
            {hasInteracted ? 'Live estimate' : 'Example'}
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
          Curve is calibrated to Indian resale patterns using segment-level retention benchmarks, adjusted for fuel type and city.
          Assumes average annual usage (~12,000 km/yr), average condition, and no accident history.
          For a model-specific forecast with variant-level detail, open the report from the top 50 list below.
        </p>
      </div>
    </div>
  );
}
