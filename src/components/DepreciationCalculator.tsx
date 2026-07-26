import { useMemo, useState } from 'react';

/**
 * CarEdge-style depreciation calculator, India-adapted.
 * Inputs: current age (yrs), current price (₹L ex-showroom equivalent),
 *   hold period (yrs), annual km.
 * Outputs: value after hold period, retention %, loss ₹ + %, cost/yr, km at exit.
 *
 * Retention pct curve is passed in from the page (per-model). Curve index = years old.
 * Annual km affects the value slightly (± vs 12k baseline).
 */

type Props = {
  make: string;
  model: string;
  exShowroom: number;   // ₹ lakh
  curvePct: number[];   // retention % at year 0..10+
};

const AGE_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const HOLD_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const KM_OPTIONS = [8000, 10000, 12000, 15000, 18000, 20000, 25000];

// Get retention at a given age, with linear interpolation between integer years.
function retentionAt(curve: number[], age: number): number {
  const maxIdx = curve.length - 1;
  if (age <= 0) return curve[0];
  if (age >= maxIdx) return curve[maxIdx];
  const i = Math.floor(age);
  const frac = age - i;
  return curve[i] + (curve[i + 1] - curve[i]) * frac;
}

// Km adjustment: 12,000 km/yr = neutral. Every 1,000 km above/below shifts value ~0.4%.
function kmAdjustment(totalKm: number, expectedKm: number): number {
  const diff = (totalKm - expectedKm) / 1000;
  return 1 - diff * 0.004;
}

function fmtInr(lakh: number): string {
  // Prices under 100L show as ₹X.XXL, else ₹X.XXCr
  if (lakh >= 100) return `₹${(lakh / 100).toFixed(2)}Cr`;
  return `₹${lakh.toFixed(2)}L`;
}

function fmtKm(km: number): string {
  return `${km.toLocaleString('en-IN')} km`;
}

export default function DepreciationCalculator({ make, model, exShowroom, curvePct }: Props) {
  const [currentAge, setCurrentAge] = useState(2);
  const [currentPrice, setCurrentPrice] = useState(exShowroom);
  const [hold, setHold] = useState(3);
  const [annualKm, setAnnualKm] = useState(12000);

  const result = useMemo(() => {
    const startAge = currentAge;
    const endAge = currentAge + hold;

    // Back-solve the "new-car equivalent" so the curve is anchored to user's current price.
    const currentRet = retentionAt(curvePct, startAge) / 100;
    const impliedNew = currentRet > 0 ? currentPrice / currentRet : currentPrice;

    // Km adjustment vs 12k baseline over hold period.
    const totalKmAtExit = annualKm * endAge;
    const expectedKm = 12000 * endAge;
    const kmMult = kmAdjustment(totalKmAtExit, expectedKm);

    const endRet = retentionAt(curvePct, endAge) / 100;
    const rawEndValue = impliedNew * endRet;
    const endValue = Math.max(0.1, rawEndValue * kmMult);

    const lost = currentPrice - endValue;
    const lostPct = (lost / currentPrice) * 100;
    const retentionOverHold = (endValue / currentPrice) * 100;
    const costPerYear = lost / hold;

    return { endValue, lost, lostPct, retentionOverHold, costPerYear, totalKmAtExit };
  }, [currentAge, currentPrice, hold, annualKm, curvePct]);

  return (
    <div className="bg-white border border-cream-200 rounded-lg p-6 md:p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-1">Depreciation calculator</div>
        <h3 className="text-2xl font-serif text-navy-900">
          What will your {make} {model} be worth?
        </h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-soft mb-1.5 block">Current age</span>
          <select
            value={currentAge}
            onChange={e => setCurrentAge(Number(e.target.value))}
            className="w-full bg-white border border-cream-200 rounded-md px-3 py-2.5 text-navy-900 focus:outline-none focus:border-navy-700"
          >
            {AGE_OPTIONS.map(a => (
              <option key={a} value={a}>{a === 0 ? 'Brand new' : `${a} year${a > 1 ? 's' : ''} old`}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-soft mb-1.5 block">Current price (₹ lakh)</span>
          <input
            type="number"
            step="0.1"
            min="0.5"
            value={currentPrice}
            onChange={e => setCurrentPrice(Number(e.target.value))}
            className="w-full bg-white border border-cream-200 rounded-md px-3 py-2.5 text-navy-900 font-data focus:outline-none focus:border-navy-700"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-soft mb-1.5 block">Own it for</span>
          <select
            value={hold}
            onChange={e => setHold(Number(e.target.value))}
            className="w-full bg-white border border-cream-200 rounded-md px-3 py-2.5 text-navy-900 focus:outline-none focus:border-navy-700"
          >
            {HOLD_OPTIONS.map(h => (
              <option key={h} value={h}>{h} year{h > 1 ? 's' : ''}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-slate-soft mb-1.5 block">Annual driving</span>
          <select
            value={annualKm}
            onChange={e => setAnnualKm(Number(e.target.value))}
            className="w-full bg-white border border-cream-200 rounded-md px-3 py-2.5 text-navy-900 focus:outline-none focus:border-navy-700"
          >
            {KM_OPTIONS.map(k => (
              <option key={k} value={k}>{k.toLocaleString('en-IN')} km/yr</option>
            ))}
          </select>
        </label>
      </div>

      {/* Big result */}
      <div className="bg-cream-100 rounded-lg p-6 mb-4">
        <div className="text-xs uppercase tracking-widest text-slate-soft mb-2">Value after {hold} year{hold > 1 ? 's' : ''}</div>
        <div className="font-data text-4xl md:text-5xl text-navy-900 font-semibold mb-4">{fmtInr(result.endValue)}</div>

        {/* Retention bar */}
        <div className="mb-1">
          <div className="relative h-2 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-2 bg-signal-500 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, result.retentionOverHold))}%` }}
            />
          </div>
          <div className="text-xs text-graphite mt-1.5">
            <span className="font-data text-navy-900 font-semibold">{result.retentionOverHold.toFixed(0)}%</span> of today's value retained
          </div>
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border-t border-cream-200 pt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Starting value</div>
          <div className="font-data text-navy-900 font-semibold">{fmtInr(currentPrice)}</div>
        </div>
        <div className="border-t border-cream-200 pt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Lost to depreciation</div>
          <div className="font-data text-caution-600 font-semibold">
            {fmtInr(result.lost)} <span className="text-xs text-graphite font-normal">({result.lostPct.toFixed(0)}%)</span>
          </div>
        </div>
        <div className="border-t border-cream-200 pt-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-soft mb-1">Cost per year</div>
          <div className="font-data text-navy-900 font-semibold">{fmtInr(result.costPerYear)}/yr</div>
        </div>
      </div>

      <div className="text-xs text-slate-soft mt-4 leading-relaxed">
        Estimated odometer at exit: <span className="font-data text-graphite">{fmtKm(result.totalKmAtExit)}</span>.
        Curve calibrated to Indian resale data. Assumes average condition and no accident history.
      </div>
    </div>
  );
}
