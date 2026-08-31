import { useEffect, useState } from 'react';
import {
  fetchVehicleScreenItems,
  fetchVariants,
  fetchPricing,
  type City,
  type Variant,
  type PricingResult,
} from '../lib/cars24';

interface ScreenItem {
  id: string;
  title: string;
  logoUrl: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

function toLakhs(v: number) {
  return Math.round((v / 100000) * 10) / 10;
}

// Route multipliers applied to fair-market expected value.
// Pattern is industry-wide, not platform-specific: private sale sits highest,
// dealer trade-in and same-day online buyers price in reconditioning + resale risk.
const ROUTE_MULT = {
  individual: 1.05,
  dealer: 0.93,
  online: 0.90,
  buy: 1.10,
};

const CONDITION_LABEL = {
  fair: 'Fair',
  good: 'Good',
  veryGood: 'Very Good',
  excellent: 'Excellent',
} as const;

type Condition = keyof typeof CONDITION_LABEL;

function computeRoutes(expected: number) {
  return {
    individual: Math.round(expected * ROUTE_MULT.individual * 10) / 10,
    dealer: Math.round(expected * ROUTE_MULT.dealer * 10) / 10,
    online: Math.round(expected * ROUTE_MULT.online * 10) / 10,
    buy: Math.round(expected * ROUTE_MULT.buy * 10) / 10,
  };
}

function deriveConfidence(low: number, high: number, expected: number): 'High' | 'Medium' | 'Lower' {
  if (expected <= 0) return 'Lower';
  const spread = (high - low) / expected;
  if (spread < 0.15) return 'High';
  if (spread < 0.30) return 'Medium';
  return 'Lower';
}

// Two-letter state code to canonical Cars24 city slug we can prefill after
// parsing a registration number. Not exhaustive but covers the metros and
// tier-1 cities that account for the bulk of valuation requests. Anything
// outside this map falls back to the user picking a city manually.
const STATE_CODE_TO_CITY_SLUG: Record<string, string> = {
  DL: 'delhi',
  HR: 'gurgaon',
  UP: 'noida',
  MH: 'mumbai',
  KA: 'bengaluru',
  TN: 'chennai',
  TS: 'hyderabad',
  AP: 'visakhapatnam',
  WB: 'kolkata',
  GJ: 'ahmedabad',
  RJ: 'jaipur',
  PB: 'ludhiana',
  KL: 'kochi',
  MP: 'indore',
  CH: 'chandigarh',
  JK: 'jammu',
  UK: 'dehradun',
  BR: 'patna',
  OD: 'bhubaneswar',
  JH: 'ranchi',
  AS: 'guwahati',
};

// Loose but forgiving Indian RC pattern: XX 00 X(X) 0000
// Accepts the common variants "DL01AB1234", "DL 01 AB 1234", "MH-12-AB-1234"
// and the newer BH-series numbers.
function normaliseReg(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase();
}

function isValidReg(reg: string): boolean {
  const r = normaliseReg(reg);
  if (/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/.test(r)) return true;      // Standard state series
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(r)) return true;             // BH-series (year prefix)
  return false;
}

function stateCodeFor(reg: string): string | null {
  const r = normaliseReg(reg);
  if (/^\d{2}BH/.test(r)) return null; // BH-series has no state
  const m = r.match(/^([A-Z]{2})/);
  return m ? m[1] : null;
}

export default function ValuationCalculator() {
  const [regNumber, setRegNumber] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [variant, setVariant] = useState('');
  const [km, setKm] = useState('');
  const [city, setCity] = useState('');
  const [result, setResult] = useState<PricingResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [condition, setCondition] = useState<Condition>('good');
  const [makes, setMakes] = useState<ScreenItem[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);
  const [models, setModels] = useState<ScreenItem[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [years, setYears] = useState<ScreenItem[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Rotating status messages shown while the live pricing call is in flight.
  // The call usually resolves in 3–10s; the ticker keeps the user oriented so
  // slower responses don't feel like a broken page.
  const LOADING_STEPS = [
    'Pulling recent comparable sales in your city…',
    'Adjusting for kilometres, year and variant mix…',
    'Applying route multipliers (individual / dealer / online)…',
    'Cross-checking against the last 90 days of transactions…',
    'Almost there. Finalising your fair-market band…',
  ];

  useEffect(() => {
    if (!pricingLoading) {
      setLoadingStep(0);
      return;
    }
    const id = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [pricingLoading]);

  useEffect(() => {
    fetch('/api/makes.json')
      .then((res) => res.json())
      .then((data: ScreenItem[]) => setMakes(data))
      .catch(() => setMakes([]))
      .finally(() => setMakesLoading(false));

    fetch('/api/cities.json')
      .then((res) => res.json())
      .then((data: unknown) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);

  const selectedMake = makes.find(m => slugify(m.title) === make);

  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    let cancelled = false;
    setModelsLoading(true);
    fetch(`/api/models/${selectedMake.id}.json`)
      .then((res) => res.json())
      .then((data: ScreenItem[]) => { if (!cancelled) setModels(data); })
      .catch(() => { if (!cancelled) setModels([]); })
      .finally(() => { if (!cancelled) setModelsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMake?.id]);

  const selectedModel = models.find(m => slugify(m.title) === model);

  useEffect(() => {
    if (!selectedMake || !selectedModel) {
      setYears([]);
      return;
    }
    let cancelled = false;
    setYearsLoading(true);
    fetchVehicleScreenItems('year_screen', 'year', {
      make: selectedMake.id,
      model: selectedModel.id,
    })
      .then((data) => { if (!cancelled) setYears(data); })
      .catch(() => { if (!cancelled) setYears([]); })
      .finally(() => { if (!cancelled) setYearsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMake?.id, selectedModel?.id]);

  useEffect(() => {
    if (!selectedMake || !selectedModel || !year) {
      setVariants([]);
      return;
    }
    let cancelled = false;
    setVariantsLoading(true);
    fetchVariants(selectedMake.id, selectedModel.id, year)
      .then((data) => { if (!cancelled) setVariants(data); })
      .catch(() => { if (!cancelled) setVariants([]); })
      .finally(() => { if (!cancelled) setVariantsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedMake?.id, selectedModel?.id, year]);

  const selectedVariant = variants.find(v => v.id === variant);
  const selectedCity = cities.find(c => c.slug === city);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariant || !selectedCity) return;

    setPricingLoading(true);
    setPricingError(null);
    try {
      const priced = await fetchPricing({
        variantId: selectedVariant.id,
        year: Number(year),
        fuelType: selectedVariant.fuelType,
        transmissionType: selectedVariant.transmissionType,
        kms: Number(km),
        cityId: selectedCity.id,
        stateId: selectedCity.stateId,
        rtoCode: `${selectedCity.stateCode}01`,
      });
      setResult(priced);
      setSubmitted(true);
    } catch {
      setPricingError('We could not fetch a live valuation for this vehicle right now. Please try again in a moment.');
    } finally {
      setPricingLoading(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setResult(null);
    setCondition('good');
    setPricingError(null);
  };

  // Attempt to auto-fill make, model and city from an Indian registration
  // number. The state-code -> city prefill runs entirely client-side. A real
  // RC to make/model lookup requires a licensed VAHAN backend; when one is
  // wired up at `/api/rc-lookup`, we consume it here. Until then we tell
  // the user to fill make/model manually and we prefill city where we can.
  const detectFromReg = async () => {
    const reg = normaliseReg(regNumber);
    if (!reg) {
      setRegMessage('Enter a registration number to try auto-detect.');
      return;
    }
    if (!isValidReg(reg)) {
      setRegMessage('That does not look like a valid Indian registration. Example: DL01AB1234.');
      return;
    }
    setRegBusy(true);
    setRegMessage(null);

    // Prefill city from state code (free, no lookup required).
    const stateCode = stateCodeFor(reg);
    const citySlugGuess = stateCode ? STATE_CODE_TO_CITY_SLUG[stateCode] : null;
    if (citySlugGuess && cities.some((c) => c.slug === citySlugGuess)) {
      setCity(citySlugGuess);
    }

    // Try a real RC lookup if the backend is wired. Fails silently when the
    // endpoint is absent so the user still gets the state-based city prefill.
    try {
      const res = await fetch(`/api/rc-lookup?reg=${encodeURIComponent(reg)}`);
      if (res.ok) {
        const data = await res.json() as {
          make?: string;
          model?: string;
          year?: string;
          fuelType?: string;
        };
        if (data.make) {
          const matched = makes.find((m) => slugify(m.title) === slugify(data.make!));
          if (matched) setMake(slugify(matched.title));
        }
        // Model and year prefill happen after the make-triggered list loads,
        // so we stash them for a follow-up effect once options arrive.
        if (data.model) setPendingModel(slugify(data.model));
        if (data.year) setPendingYear(data.year);
        setRegMessage(`Found ${data.make || ''} ${data.model || ''} ${data.year ? `(${data.year})` : ''}. Confirm and add km driven below.`.trim());
        setRegBusy(false);
        return;
      }
    } catch {
      // Ignore; fall through to the fallback message below.
    }

    setRegMessage(
      citySlugGuess
        ? `Registered in ${stateCode}. City set to ${citySlugGuess.replace(/^\w/, (c) => c.toUpperCase())}. Please confirm make, model and variant below.`
        : 'Registration read. Please enter make, model and variant below.'
    );
    setRegBusy(false);
  };

  // Deferred prefills that need dropdown options to finish loading first.
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [pendingYear, setPendingYear] = useState<string | null>(null);

  useEffect(() => {
    if (pendingModel && models.some((m) => slugify(m.title) === pendingModel)) {
      setModel(pendingModel);
      setPendingModel(null);
    }
  }, [pendingModel, models]);

  useEffect(() => {
    if (pendingYear && years.some((y) => y.id === pendingYear)) {
      setYear(pendingYear);
      setPendingYear(null);
    }
  }, [pendingYear, years]);

  if (submitted && result) {
    const tier = result.byCondition[condition];
    const low = toLakhs(tier.low);
    const high = toLakhs(tier.high);
    const expected = Math.round(((low + high) / 2) * 10) / 10;
    const bandRange = high - low;
    const expectedPos = bandRange > 0 ? ((expected - low) / bandRange) * 100 : 50;
    const routes = computeRoutes(expected);
    const confidence = deriveConfidence(toLakhs(result.low), toLakhs(result.high), expected);

    return (
      <div className="card-institutional bg-white max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Your fair-market valuation</div>

        <div className="mb-6">
          <div className="text-sm text-graphite mb-2">
            {year} {selectedMake?.title} {selectedModel?.title} {selectedVariant?.title} · {Number(km).toLocaleString('en-IN')} km · {selectedCity?.name} · condition {CONDITION_LABEL[condition]}
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <div className="font-data text-4xl font-medium text-navy-900">₹{expected}L</div>
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
              {(Object.keys(CONDITION_LABEL) as Condition[]).map(c => (
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
          <span>₹{low}L</span>
          <span>₹{high}L</span>
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

        {/* Confidence strip */}
        <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-cream-200 text-sm">
          <div>
            <div className="text-xs text-slate-soft mb-1">Confidence</div>
            <div className="font-medium text-navy-900">{confidence}</div>
          </div>
          <div>
            <div className="text-xs text-slate-soft mb-1">Comparables</div>
            <div className="font-medium text-navy-900 font-data">{result.comparables.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs text-slate-soft mb-1">Last refresh</div>
            <div className="font-medium text-navy-900">Just now</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-cream-100 rounded-md text-sm text-graphite leading-relaxed">
          <strong className="text-navy-900">What this means.</strong> If you sell in the next 30 days, the market is likely to pay you between <strong>₹{low}L and ₹{high}L</strong>. Any offer significantly below ₹{low}L is under-market. Any offer above ₹{high}L is above-market. Good outcome, but verify buyer credibility.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-navy-900 !text-white text-sm font-medium rounded-md hover:bg-navy-800 transition-colors"
          >
            Value another vehicle
          </button>
          <a
            href="/methodology"
            className="px-5 py-2.5 bg-white border border-cream-200 !text-navy-900 text-sm font-medium rounded-md hover:border-navy-900 transition-colors no-underline"
          >
            How we calculate this →
          </a>
        </div>

        <div className="mt-6 pt-6 border-t border-cream-200 text-xs text-slate-soft">
          Valuation from a live pricing model.
          <a href="/methodology" className="ml-1">See our methodology.</a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-institutional bg-white max-w-2xl">
      <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Free · 30 seconds · No signup</div>
      <h2 className="text-2xl font-serif text-navy-900 mb-6">Tell us about your vehicle</h2>

      {/* Lead-in: registration number. Auto-fills make/model/year/city where
          we can, and falls through to the manual dropdowns below otherwise. */}
      <div className="mb-6 p-4 bg-cream-100 rounded-md border border-cream-200">
        <label htmlFor="rc-number" className="block text-xs uppercase tracking-widest text-slate-soft mb-2">
          Start with your registration number
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="rc-number"
            type="text"
            value={regNumber}
            onChange={(e) => { setRegNumber(e.target.value); setRegMessage(null); }}
            placeholder="e.g. DL 01 AB 1234"
            autoComplete="off"
            inputMode="text"
            className="flex-1 px-3 py-2.5 bg-white border border-cream-200 rounded-md text-sm font-data uppercase tracking-wider focus:border-navy-900 focus:outline-none"
          />
          <button
            type="button"
            onClick={detectFromReg}
            disabled={regBusy || !regNumber.trim()}
            className="px-5 py-2.5 bg-navy-900 !text-white text-sm font-medium rounded-md hover:bg-navy-800 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {regBusy ? 'Detecting…' : 'Auto-detect'}
          </button>
        </div>
        {regMessage && (
          <div className="text-xs text-graphite mt-2 leading-relaxed">{regMessage}</div>
        )}
        <div className="text-xs text-slate-soft mt-2 leading-relaxed">
          We use it only to look up make, model, and city. We don't store it, and we don't share it.
        </div>
      </div>

      {pricingError && (
        <div role="alert" className="mb-6 p-3 bg-caution-500/10 border border-caution-500/30 rounded-md text-xs text-graphite leading-relaxed">
          {pricingError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Make</label>
          <select
            required
            value={make}
            onChange={(e) => { setMake(e.target.value); setModel(''); setYear(''); setVariant(''); setPricingError(null); }}
            disabled={makesLoading}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">{makesLoading ? 'Loading makes…' : 'Select make'}</option>
            {makes.map(m => <option key={m.id} value={slugify(m.title)}>{m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Model</label>
          <select
            required
            value={model}
            onChange={(e) => { setModel(e.target.value); setYear(''); setVariant(''); setPricingError(null); }}
            disabled={!make || modelsLoading}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">{modelsLoading ? 'Loading models…' : 'Select model'}</option>
            {models.map(m => <option key={m.id} value={slugify(m.title)}>{m.title}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Year of manufacture</label>
          <select
            required
            value={year}
            onChange={(e) => { setYear(e.target.value); setVariant(''); setPricingError(null); }}
            disabled={!selectedModel || yearsLoading}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">{yearsLoading ? 'Loading years…' : 'Select year'}</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.title}</option>)}
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
          <label className="block text-sm font-medium text-navy-900 mb-1.5">Variant</label>
          <select
            required={variants.length > 0}
            value={variant}
            onChange={(e) => { setVariant(e.target.value); setPricingError(null); }}
            disabled={!year || variantsLoading}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {variantsLoading ? 'Loading variants…' : variants.length > 0 ? 'Select variant' : 'No variants found'}
            </option>
            {variants.map(v => (
              <option key={v.id} value={v.id}>
                {v.title} · {v.fuelType} · {v.transmissionType}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-navy-900 mb-1.5">City</label>
          <select
            required={cities.length > 0}
            value={city}
            onChange={(e) => { setCity(e.target.value); setPricingError(null); }}
            disabled={citiesLoading}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">
              {citiesLoading ? 'Loading cities…' : cities.length > 0 ? 'Select city' : 'City list unavailable'}
            </option>
            {cities.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pricingLoading}
        className="mt-6 w-full py-3 bg-navy-900 !text-white font-medium rounded-md hover:bg-navy-800 transition-colors disabled:opacity-50"
      >
        {pricingLoading ? 'Fetching your live valuation…' : 'Check car valuation →'}
      </button>

      {pricingLoading && (
        <div
          className="mt-4 p-4 bg-cream-100 rounded-md border border-cream-200"
          role="status"
          aria-live="polite"
        >
          <div className="trv-ticker-track mb-3" aria-hidden="true">
            <div className="trv-ticker-bar"></div>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm text-navy-900 font-medium leading-snug">
              {LOADING_STEPS[loadingStep]}
            </div>
            <div className="text-[11px] text-slate-soft shrink-0 font-data">
              ~5–10 sec
            </div>
          </div>
          <div className="text-[11px] text-slate-soft mt-1 leading-relaxed">
            We hit our live pricing model in real time, so this takes a few seconds. Please don't refresh.
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-soft leading-relaxed">
        We do not ask for your name, phone, or email. No dealer calls, no spam.
        Read our <a href="/privacy">privacy policy</a> and <a href="/methodology">methodology</a>.
      </p>
    </form>
  );
}
