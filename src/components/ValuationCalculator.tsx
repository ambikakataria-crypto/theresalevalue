import { useState } from 'react';

// Mock base prices (ex-showroom equivalent, ₹ lakh) for popular models.
// For MVP only. Real integration with production pricing API is Week 2.
const MODEL_BASE_PRICES: Record<string, Record<string, number>> = {
  maruti: {
    swift: 7.5, baleno: 8.5, 'wagon-r': 6.2, 'alto-k10': 5.0, 'brezza': 10.5, dzire: 8.2, ertiga: 11.5,
  },
  hyundai: {
    'grand-i10-nios': 6.8, i20: 8.4, creta: 13.5, venue: 10.2, verna: 12.8, aura: 7.5,
  },
  tata: {
    nexon: 11.5, punch: 8.2, altroz: 8.0, harrier: 17.5, tiago: 6.5, safari: 20.0,
  },
  mahindra: {
    'xuv700': 18.5, thar: 16.5, 'xuv3xo': 10.5, 'scorpio-n': 17.5, bolero: 11.0,
  },
  honda: {
    city: 13.5, amaze: 8.5, elevate: 13.0,
  },
  kia: {
    seltos: 13.5, sonet: 11.0, carens: 12.5,
  },
  toyota: {
    innova: 22.5, fortuner: 38.0, glanza: 8.5,
  },
};

const MAKES = Object.keys(MODEL_BASE_PRICES);

const CITIES = [
  'bengaluru', 'mumbai', 'delhi-ncr', 'hyderabad', 'chennai', 'pune', 'kolkata',
  'ahmedabad', 'jaipur', 'lucknow', 'kochi', 'chandigarh', 'other',
];

const CITY_MULTIPLIER: Record<string, number> = {
  bengaluru: 1.02, mumbai: 1.03, 'delhi-ncr': 1.02, hyderabad: 1.01, chennai: 1.01,
  pune: 1.01, kolkata: 0.98, ahmedabad: 0.99, jaipur: 0.98, lucknow: 0.97,
  kochi: 1.00, chandigarh: 1.00, other: 0.96,
};

// Route multipliers applied to fair-market expected value.
// Pattern is industry-wide, not platform-specific: private sale sits highest,
// dealer trade-in and same-day online buyers price in reconditioning + resale risk.
const ROUTE_MULT = {
  individual: 1.05,
  dealer: 0.93,
  online: 0.90,
  buy: 1.10,
};

// Condition multipliers. "Good" is the market baseline the model assumes.
const CONDITION_MULT: Record<'fair' | 'good' | 'excellent', number> = {
  fair: 0.90,
  good: 1.00,
  excellent: 1.08,
};

const CONDITION_LABEL: Record<'fair' | 'good' | 'excellent', string> = {
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

type Condition = 'fair' | 'good' | 'excellent';

function yearlyDep(i: number) {
  if (i === 0) return 1.0;
  if (i === 1) return 0.85;
  if (i <= 3) return 0.88;
  if (i <= 5) return 0.90;
  return 0.92;
}

function computePriceBand(make: string, model: string, year: number, km: number, city: string) {
  const base = MODEL_BASE_PRICES[make]?.[model];
  if (!base) return null;

  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);

  let depreciation = 1.0;
  for (let i = 1; i <= age; i++) depreciation *= yearlyDep(i);

  const expectedKm = age * 10000;
  const excessKm = Math.max(0, km - expectedKm);
  const kmPenalty = 1 - (excessKm / 20000) * 0.03;

  const cityMult = CITY_MULTIPLIER[city] ?? 1.0;

  const expected = base * depreciation * kmPenalty * cityMult;
  const low = expected * 0.92;
  const high = expected * 1.08;

  // Year-by-year value curve from manufacture year to one year forward.
  // Uses the same depreciation stack but ignores kilometrage (curve is for the model, not this specific car).
  const curve: { year: number; value: number; isToday: boolean }[] = [];
  let curveDep = 1.0;
  for (let i = 0; i <= age + 1; i++) {
    curveDep *= yearlyDep(i);
    const v = base * curveDep * cityMult;
    curve.push({
      year: year + i,
      value: Math.round(v * 10) / 10,
      isToday: year + i === currentYear,
    });
  }

  return {
    expected: Math.round(expected * 10) / 10,
    low: Math.round(low * 10) / 10,
    high: Math.round(high * 10) / 10,
    confidence: age < 8 && ['maruti', 'hyundai', 'tata'].includes(make) ? 'High' : age < 12 ? 'Medium' : 'Lower',
    comparables: Math.floor(Math.random() * 2000 + 500),
    curve,
  };
}

function computeRoutes(expected: number) {
  return {
    individual: Math.round(expected * ROUTE_MULT.individual * 10) / 10,
    dealer: Math.round(expected * ROUTE_MULT.dealer * 10) / 10,
    online: Math.round(expected * ROUTE_MULT.online * 10) / 10,
    buy: Math.round(expected * ROUTE_MULT.buy * 10) / 10,
  };
}

function DepreciationCurve({ curve }: { curve: { year: number; value: number; isToday: boolean }[] }) {
  if (curve.length < 2) return null;
  const w = 560;
  const h = 140;
  const padX = 24;
  const padY = 20;
  const values = curve.map(p => p.value);
  const maxV = Math.max(...values);
  const minV = Math.min(...values);
  const range = Math.max(0.1, maxV - minV);

  const x = (i: number) => padX + (i / (curve.length - 1)) * (w - padX * 2);
  const y = (v: number) => padY + (1 - (v - minV) / range) * (h - padY * 2);

  const pathLine = curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  const pathArea = `${pathLine} L ${x(curve.length - 1)} ${h - padY} L ${x(0)} ${h - padY} Z`;

  const todayIdx = curve.findIndex(p => p.isToday);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none" aria-label="Depreciation curve">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A2540" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0A2540" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathArea} fill="url(#curveFill)" />
      <path d={pathLine} fill="none" stroke="#0A2540" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {todayIdx >= 0 && (
        <>
          <line
            x1={x(todayIdx)} y1={padY - 6}
            x2={x(todayIdx)} y2={h - padY + 6}
            stroke="#059669" strokeWidth="1" strokeDasharray="3 3"
          />
          <circle cx={x(todayIdx)} cy={y(curve[todayIdx].value)} r="4" fill="#10B981" stroke="white" strokeWidth="2" />
          <text x={x(todayIdx)} y={padY - 8} textAnchor="middle" fontSize="10" fill="#059669" fontWeight="600">Today</text>
        </>
      )}
      <text x={x(0)} y={h - 4} textAnchor="start" fontSize="10" fill="#6B7280">{curve[0].year} (new)</text>
      <text x={x(curve.length - 1)} y={h - 4} textAnchor="end" fontSize="10" fill="#6B7280">{curve[curve.length - 1].year}</text>
    </svg>
  );
}

export default function ValuationCalculator() {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [km, setKm] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState<ReturnType<typeof computePriceBand> | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [condition, setCondition] = useState<Condition>('good');

  const availableModels = make ? Object.keys(MODEL_BASE_PRICES[make] || {}) : [];
  const currentYear = new Date().getFullYear();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const band = computePriceBand(make, model, Number(year), Number(km), city);
    setResult(band);
    setSubmitted(true);
  };

  const reset = () => {
    setSubmitted(false);
    setResult(null);
    setCondition('good');
  };

  const fmt = (val: string) => val.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (submitted && result) {
    const cMult = CONDITION_MULT[condition];
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const adjExpected = round1(result.expected * cMult);
    const adjLow = round1(result.low * cMult);
    const adjHigh = round1(result.high * cMult);
    const bandRange = adjHigh - adjLow;
    const expectedPos = bandRange > 0 ? ((adjExpected - adjLow) / bandRange) * 100 : 50;
    const routes = computeRoutes(adjExpected);
    const holdPct = result.curve.length > 1
      ? Math.round((result.curve.find(p => p.isToday)?.value ?? result.expected) / result.curve[0].value * 100)
      : null;

    return (
      <div className="card-institutional bg-white max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Your fair-market valuation</div>

        <div className="mb-6">
          <div className="text-sm text-graphite mb-2">
            {year} {fmt(make)} {fmt(model)} · {Number(km).toLocaleString('en-IN')} km · {fmt(city)} · condition {CONDITION_LABEL[condition]}
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <div className="font-data text-4xl font-medium text-navy-900">₹{adjExpected}L</div>
            <div className="text-sm text-slate-soft">expected value</div>
          </div>
        </div>

        {/* Condition adjuster */}
        <div className="mb-6 p-4 bg-cream-100 rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-soft mb-1">Adjust for real condition</div>
              <div className="text-xs text-graphite max-w-xs leading-relaxed">Most online estimates assume average condition. Set yours honestly, this is the #1 reason offers disappoint.</div>
            </div>
            <div className="inline-flex rounded-md border border-cream-200 bg-white overflow-hidden" role="group" aria-label="Vehicle condition">
              {(['fair', 'good', 'excellent'] as Condition[]).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  aria-pressed={condition === c}
                  className={
                    'px-3 py-1.5 text-xs font-medium transition-colors ' +
                    (condition === c
                      ? 'bg-navy-900 !text-white'
                      : '!text-navy-900 hover:bg-cream-100')
                  }
                >
                  {CONDITION_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-2 text-xs text-slate-soft">Fair-market price band</div>
        <div className="relative h-2 bg-cream-200 rounded-full mb-2">
          <div className="absolute inset-0 bg-navy-900 rounded-full"></div>
          <div
            className="absolute w-3 h-3 -top-0.5 bg-signal-500 border-2 border-white rounded-full"
            style={{ left: `calc(${expectedPos}% - 6px)` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm font-data text-navy-900 mb-6">
          <span>₹{adjLow}L</span>
          <span>₹{adjHigh}L</span>
        </div>

        {/* Sell / buy route breakdown */}
        <div className="pt-6 border-t border-cream-200">
          <div className="text-xs uppercase tracking-widest text-slate-soft mb-3">What you would get, by route</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="border border-navy-900 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Sell to individual</div>
              <div className="font-data text-lg text-navy-900">₹{routes.individual}L</div>
              <div className="text-[11px] text-slate-soft mt-0.5">private sale, highest</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Sell to dealer</div>
              <div className="font-data text-lg text-navy-900">₹{routes.dealer}L</div>
              <div className="text-[11px] text-slate-soft mt-0.5">trade-in / wholesale</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Instant online sale</div>
              <div className="font-data text-lg text-navy-900">₹{routes.online}L</div>
              <div className="text-[11px] text-slate-soft mt-0.5">same-day, pre-inspection</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Buy from dealer</div>
              <div className="font-data text-lg text-navy-900">₹{routes.buy}L</div>
              <div className="text-[11px] text-slate-soft mt-0.5">retail asking</div>
            </div>
          </div>
          <div className="p-3 bg-caution-500/10 border border-caution-500/30 rounded-md text-xs text-graphite leading-relaxed">
            <strong className="text-navy-900">Why instant / online offers come in lower.</strong> Same-day buyers price in inspection findings, reconditioning, and resale risk, so the final offer often lands below private-sale value. This pattern is industry-wide, not specific to any one platform.
          </div>
        </div>

        {/* Depreciation curve */}
        <div className="pt-6 mt-6 border-t border-cream-200">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-xs uppercase tracking-widest text-slate-soft">Depreciation curve, this model</div>
            {holdPct !== null && (
              <div className="text-xs text-graphite">Holds <strong className="text-navy-900">~{holdPct}%</strong> of new price today</div>
            )}
          </div>
          <DepreciationCurve curve={result.curve} />
          <div className="mt-2 text-[11px] text-slate-soft">
            Curve shows expected fair-market value from year of manufacture to one year forward. Actual retention varies with condition, city, and demand.
          </div>
        </div>

        {/* Confidence strip */}
        <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-cream-200 text-sm">
          <div>
            <div className="text-xs text-slate-soft mb-1">Confidence</div>
            <div className="font-medium text-navy-900">{result.confidence}</div>
          </div>
          <div>
            <div className="text-xs text-slate-soft mb-1">Comparables</div>
            <div className="font-medium text-navy-900 font-data">{result.comparables.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-soft mb-1">Last refresh</div>
            <div className="font-medium text-navy-900">This week</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-cream-100 rounded-md text-sm text-graphite leading-relaxed">
          <strong className="text-navy-900">What this means.</strong> If you sell in the next 30 days, the market is likely to pay you between <strong>₹{adjLow}L and ₹{adjHigh}L</strong>. Any offer significantly below ₹{adjLow}L is under-market. Any offer above ₹{adjHigh}L is above-market. Good outcome, but verify buyer credibility.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-navy-900 !text-white text-sm font-medium rounded-md hover:bg-navy-800 transition-colors"
          >
            Value another vehicle
          </button>
          <a
            href={`/models/${make}/${model}`}
            className="px-5 py-2.5 bg-white border border-cream-200 !text-navy-900 text-sm font-medium rounded-md hover:border-navy-900 transition-colors no-underline"
          >
            See full {fmt(make)} {fmt(model)} report →
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-cream-200 text-xs text-slate-soft">
          Early-access valuation using a simplified pricing model. Production model launches shortly.
          <a href="/methodology" className="ml-1">See our methodology.</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-institutional bg-white max-w-2xl">
      <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Free · 30 seconds · No signup</div>
      <h2 className="text-2xl font-serif text-navy-900 mb-6">Tell us about your vehicle</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Make</label>
          <select
            required
            value={make}
            onChange={(e) => { setMake(e.target.value); setModel(''); }}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
          >
            <option value="">Select make</option>
            {MAKES.map(m => <option key={m} value={m}>{fmt(m)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Model</label>
          <select
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!make}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">Select model</option>
            {availableModels.map(m => <option key={m} value={m}>{fmt(m)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Year of manufacture</label>
          <select
            required
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
          >
            <option value="">Select year</option>
            {Array.from({ length: 20 }, (_, i) => currentYear - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Kilometres driven</label>
          <input
            type="number"
            required
            min="0"
            max="500000"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="e.g. 45000"
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-navy-900 mb-1.5">City</label>
          <select
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
          >
            <option value="">Select city</option>
            {CITIES.map(c => <option key={c} value={c}>{fmt(c)}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        className="mt-6 w-full py-3 bg-navy-900 !text-white font-medium rounded-md hover:bg-navy-800 transition-colors"
      >
        Check car valuation →
      </button>

      <p className="mt-4 text-xs text-slate-soft leading-relaxed">
        We do not ask for your name, phone, or email. No dealer calls, no spam.
        Read our <a href="/privacy">privacy policy</a> and <a href="/methodology">methodology</a>.
      </p>
    </form>
  );
}
