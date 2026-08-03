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

export default function ValuationCalculator() {
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

      <p className="mt-4 text-xs text-slate-soft leading-relaxed">
        We do not ask for your name, phone, or email. No dealer calls, no spam.
        Read our <a href="/privacy">privacy policy</a> and <a href="/methodology">methodology</a>.
      </p>
    </form>
  );
}
