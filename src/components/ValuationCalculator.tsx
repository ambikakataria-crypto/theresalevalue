import { useEffect, useRef, useState } from 'react';
import {
  fetchVehicleScreenItems,
  fetchVariants,
  fetchPricing,
  fetchVehicleByReg,
  RegNotFoundError,
  type City,
  type Variant,
  type PricingResult,
  type RegLookup,
} from '../lib/cars24';

interface ScreenItem {
  id: string;
  title: string;
  logoUrl: string;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Indian price formatting. Lakh notation loses all resolution below ~₹1L, where
 * a whole band collapses to a single "₹0.5L", so sub-lakh values are shown in
 * full rupees instead.
 */
function formatPrice(rupees: number) {
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
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

/** Works in rupees and rounds to the nearest hundred, so routes stay distinct. */
function computeRoutes(expected: number) {
  const r = (mult: number) => Math.round((expected * mult) / 100) * 100;
  return {
    individual: r(ROUTE_MULT.individual),
    dealer: r(ROUTE_MULT.dealer),
    online: r(ROUTE_MULT.online),
    buy: r(ROUTE_MULT.buy),
  };
}

function deriveConfidence(low: number, high: number, expected: number): 'High' | 'Medium' | 'Lower' {
  if (expected <= 0) return 'Lower';
  const spread = (high - low) / expected;
  if (spread < 0.15) return 'High';
  if (spread < 0.30) return 'Medium';
  return 'Lower';
}

// Loose but forgiving Indian RC pattern: XX 00 X(X) 0000
// Accepts the common variants "DL01AB1234", "DL 01 AB 1234", "MH-12-AB-1234"
// and the newer BH-series numbers.
function normaliseReg(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase();
}

function isValidReg(reg: string): boolean {
  const r = normaliseReg(reg);
  // State series: 2-letter state, 1-2 digit RTO district, 0-3 letter series,
  // 4 digits. Covers DL3CAB1234, MH12AB1234, KA01AB1111 and older DL1C1234.
  if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(r)) return true;
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(r)) return true;             // BH-series (year prefix)
  return false;
}

export default function ValuationCalculator() {
  const [regNumber, setRegNumber] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regMessage, setRegMessage] = useState<string | null>(null);
  const [regDetails, setRegDetails] = useState<RegLookup | null>(null);
  const [autoPrice, setAutoPrice] = useState(false);
  const [awaitingKm, setAwaitingKm] = useState(false);
  const kmInputRef = useRef<HTMLInputElement>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [variant, setVariant] = useState('');
  const [km, setKm] = useState('');
  const [city, setCity] = useState('');
  const [owners, setOwners] = useState('');
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

  const runPricing = async () => {
    if (!selectedVariant || !selectedCity || !km) return;

    setPricingLoading(true);
    setPricingError(null);

    // Registration facts only apply while the plate in the box is still the one
    // we looked up; otherwise fall back to the derived defaults.
    const rc = regDetails && normaliseReg(regNumber) === regDetails.registrationNumber
      ? regDetails
      : null;

    try {
      const priced = await fetchPricing({
        variantId: selectedVariant.id,
        year: Number(year),
        fuelType: selectedVariant.fuelType,
        transmissionType: selectedVariant.transmissionType,
        kms: Number(km),
        cityId: selectedCity.id,
        stateId: selectedCity.stateId,
        rtoCode: rc?.rtoCode ?? `${selectedCity.stateCode}01`,
        manufacturingDate: rc?.manufacturingDate,
        insuranceDate: rc?.insuranceDate,
        // The picker wins over the RC value, since the user may have corrected it.
        ownershipNumber: owners || rc?.ownershipNumber,
        color: rc?.color,
      });
      setResult(priced);
      setSubmitted(true);
    } catch {
      setPricingError('We could not fetch a live valuation for this vehicle right now. Please try again in a moment.');
    } finally {
      setPricingLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runPricing();
  };

  // When auto-detect fills the car and kilometres are already on file, price it
  // straight away. The prefill cascade resolves over several async steps, so we
  // wait for the variant and city to land rather than pricing immediately.
  useEffect(() => {
    if (!autoPrice) return;
    if (pricingLoading || !selectedVariant || !selectedCity || !km) return;
    setAutoPrice(false);
    void runPricing();
  }, [autoPrice, pricingLoading, selectedVariant?.id, selectedCity?.id, km]);

  const reset = () => {
    setSubmitted(false);
    setResult(null);
    setCondition('good');
    setPricingError(null);
    setAutoPrice(false);
    setAwaitingKm(false);
  };

  // Auto-fill the form from an Indian registration number. The RC lookup also
  // returns the real manufacturing month, RTO code, insurance expiry and owner
  // count, which are better than the defaults the manual path has to assume,
  // so we keep the whole record and feed it into the pricing call.
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
    setRegDetails(null);

    try {
      const rc = await fetchVehicleByReg(reg);
      setRegDetails(rc);

      // City comes back as a catalogue id, so it needs no guessing.
      const matchedCity = rc.cityId ? cities.find((c) => c.id === rc.cityId) : undefined;
      if (matchedCity) setCity(matchedCity.slug);

      // Make resolves immediately; the rest need their lists to load first, so
      // they are stashed and applied by the effects below as options arrive.
      if (rc.makeId) {
        const matchedMake = makes.find((m) => m.id === rc.makeId);
        if (matchedMake) setMake(slugify(matchedMake.title));
      }
      if (rc.modelId) setPendingModelId(rc.modelId);
      if (rc.year) setPendingYear(rc.year);
      if (rc.variantId) setPendingVariantId(rc.variantId);
      if (rc.variantCode) setPendingVariantCode(rc.variantCode);
      // The RC counts owners without an upper bound; the picker tops out at 4+.
      const ownerSr = Number(rc.ownershipNumber);
      if (Number.isFinite(ownerSr) && ownerSr >= 1) setOwners(String(Math.min(ownerSr, 4)));

      // ds_details can supply make/model ids without display names, so treat
      // resolved ids as the success signal and name the car from the catalogue.
      if (rc.makeId && rc.modelId) {
        const makeLabel = rc.makeName ?? makes.find((m) => m.id === rc.makeId)?.title ?? '';
        const found = [rc.year, makeLabel, rc.modelName, rc.variantName].filter(Boolean).join(' ');
        const where = matchedCity ? ` registered in ${matchedCity.name}` : '';
        if (km) {
          // Everything we need is on file, so go straight to the valuation once
          // the prefilled dropdowns finish resolving.
          setAutoPrice(true);
          setRegMessage(`Found your ${found}${where}. Fetching your valuation…`);
        } else {
          setAwaitingKm(true);
          setRegMessage(`Found your ${found}${where}. Just add kilometres driven below to see your valuation.`);
          requestAnimationFrame(() => {
            kmInputRef.current?.focus();
            kmInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
      } else {
        setRegMessage(
          `Registration found${rc.rcModel ? ` (${rc.rcModel})` : ''}${matchedCity ? `, registered in ${matchedCity.name}` : ''}, but we could not match it to a catalogue model. Please pick make, model and variant below.`
        );
      }
    } catch (err) {
      setRegMessage(
        err instanceof RegNotFoundError
          ? 'We could not find that registration number. Please enter your car details below.'
          : 'Auto-detect is unavailable right now. Please enter your car details below.'
      );
    } finally {
      setRegBusy(false);
    }
  };

  // Deferred prefills that need dropdown options to finish loading first.
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);
  const [pendingYear, setPendingYear] = useState<string | null>(null);
  const [pendingVariantId, setPendingVariantId] = useState<string | null>(null);
  const [pendingVariantCode, setPendingVariantCode] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingModelId) return;
    const match = models.find((m) => m.id === pendingModelId);
    if (match) {
      setModel(slugify(match.title));
      setPendingModelId(null);
    }
  }, [pendingModelId, models]);

  useEffect(() => {
    if (pendingYear && years.some((y) => y.id === pendingYear)) {
      setYear(pendingYear);
      setPendingYear(null);
    }
  }, [pendingYear, years]);

  // The RC variant id is scoped to its own year bucket, so it often misses the
  // list for the selected year. Fall back to matching the bare trim name.
  useEffect(() => {
    if ((!pendingVariantId && !pendingVariantCode) || !variants.length) return;
    const match =
      variants.find((v) => v.id === pendingVariantId) ??
      (pendingVariantCode
        ? variants.find((v) => v.title.toLowerCase() === pendingVariantCode.toLowerCase())
        : undefined);
    if (match) setVariant(match.id);
    setPendingVariantId(null);
    setPendingVariantCode(null);
  }, [pendingVariantId, pendingVariantCode, variants]);

  if (submitted && result) {
    const tier = result.byCondition[condition];
    const low = tier.low;
    const high = tier.high;
    const expected = Math.round((low + high) / 2);
    const bandRange = high - low;
    const expectedPos = bandRange > 0 ? ((expected - low) / bandRange) * 100 : 50;
    const routes = computeRoutes(expected);
    const confidence = deriveConfidence(result.low, result.high, expected);

    return (
      <div className="card-institutional bg-white max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-4">Your fair-market valuation</div>

        <div className="mb-6">
          <div className="text-sm text-graphite mb-2">
            {year} {selectedMake?.title} {selectedModel?.title} {selectedVariant?.title} · {Number(km).toLocaleString('en-IN')} km · {selectedCity?.name} · condition {CONDITION_LABEL[condition]}
          </div>
          <div className="flex items-baseline gap-3 mb-1">
            <div className="font-data text-4xl font-medium text-navy-900">{formatPrice(expected)}</div>
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
          <span>{formatPrice(low)}</span>
          <span>{formatPrice(high)}</span>
        </div>

        {/* Sell / buy route breakdown */}
        <div className="pt-6 border-t border-cream-200">
          <div className="text-xs uppercase tracking-widest text-slate-soft mb-3">What you would get, by route</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="border border-navy-900 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Sell to individual</div>
              <div className="font-data text-lg text-navy-900">{formatPrice(routes.individual)}</div>
              <div className="text-[11px] text-slate-soft mt-0.5">private sale, highest</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Sell to dealer</div>
              <div className="font-data text-lg text-navy-900">{formatPrice(routes.dealer)}</div>
              <div className="text-[11px] text-slate-soft mt-0.5">trade-in / wholesale</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Instant online sale</div>
              <div className="font-data text-lg text-navy-900">{formatPrice(routes.online)}</div>
              <div className="text-[11px] text-slate-soft mt-0.5">same-day, pre-inspection</div>
            </div>
            <div className="border border-cream-200 rounded-md p-3">
              <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Buy from dealer</div>
              <div className="font-data text-lg text-navy-900">{formatPrice(routes.buy)}</div>
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
          <strong className="text-navy-900">What this means.</strong> If you sell in the next 30 days, the market is likely to pay you between <strong>{formatPrice(low)} and {formatPrice(high)}</strong>. Any offer significantly below {formatPrice(low)} is under-market. Any offer above {formatPrice(high)} is above-market. Good outcome, but verify buyer credibility.
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
            ref={kmInputRef}
            type="number"
            required
            min="0"
            max="500000"
            value={km}
            onChange={(e) => { setKm(e.target.value); if (e.target.value) setAwaitingKm(false); }}
            placeholder="e.g. 45000"
            className={
              'w-full px-3 py-2.5 bg-cream border rounded-md text-sm focus:border-navy-900 focus:outline-none ' +
              (awaitingKm && !km ? 'border-signal-500 ring-2 ring-signal-500/30' : 'border-cream-200')
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-900 mb-1.5">
            Owners <span className="text-slate-soft font-normal">(optional)</span>
          </label>
          <select
            value={owners}
            onChange={(e) => setOwners(e.target.value)}
            className="w-full px-3 py-2.5 bg-cream border border-cream-200 rounded-md text-sm focus:border-navy-900 focus:outline-none"
          >
            <option value="">Not sure</option>
            <option value="1">1st owner</option>
            <option value="2">2nd owner</option>
            <option value="3">3rd owner</option>
            <option value="4">4th owner or more</option>
          </select>
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
