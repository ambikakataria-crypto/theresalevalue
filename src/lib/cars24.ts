const SCREEN_URL = 'https://api.cars24.com/gw/plt/vehiclesvc/mmv/api/v1/flow/screen';

const HEADERS = {
  'x-tenant-code': 'in',
  'x-bu-id': 'sell_mmvy',
  'x-vehicle-type': 'car',
  'x-config-version': '3',
};

export interface ScreenItem {
  id: string;
  title: string;
  logoUrl: string;
}

export async function fetchVehicleScreenItems(
  screen: 'make_screen' | 'model_screen' | 'year_screen',
  key: 'make' | 'model' | 'year',
  extraParams?: Record<string, string>
): Promise<ScreenItem[]> {
  const url = new URL(SCREEN_URL);
  url.searchParams.set('screens', screen);
  for (const [k, v] of Object.entries(extraParams ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${screen}: ${res.status}`);

  const body = await res.json();
  const items: Array<{ id: string; title: string; logo_url: string }> =
    body?.data?.screens?.vehicle?.[key]?.items ?? [];

  return items.map((item) => ({ id: item.id, title: item.title, logoUrl: item.logo_url }));
}

export interface Variant {
  id: string;
  title: string;
  subTitle: string;
  fuelType: string;
  transmissionType: string;
}

/**
 * variant_screen nests fuel -> transmission -> variant instead of returning a
 * flat items array like the other screens, so it needs its own parser.
 */
export async function fetchVariants(make: string, model: string, year: string): Promise<Variant[]> {
  const url = new URL(SCREEN_URL);
  url.searchParams.set('screens', 'variant_screen');
  url.searchParams.set('make', make);
  url.searchParams.set('model', model);
  url.searchParams.set('year', year);

  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch variant_screen: ${res.status}`);

  const body = await res.json();
  const fuels: Array<{
    id: string;
    transmission: { items: Array<{ id: string; variant: { items: Array<{ id: string; title: string; sub_title: string }> } }> };
  }> = body?.data?.screens?.vehicle?.fuel?.items ?? [];

  return fuels.flatMap((fuel) =>
    fuel.transmission.items.flatMap((transmission) =>
      transmission.variant.items.map((variant) => ({
        id: variant.id,
        title: variant.title,
        subTitle: variant.sub_title,
        fuelType: fuel.id,
        transmissionType: transmission.id,
      }))
    )
  );
}

const CITY_LIST_URL = 'https://car-catalog-gateway-in.c24.tech/api/v1/city';

export interface City {
  id: string;
  name: string;
  slug: string;
  stateId: number;
  stateCode: string;
}

export async function fetchCityList(): Promise<City[]> {
  const res = await fetch(CITY_LIST_URL);
  if (!res.ok) throw new Error(`Failed to fetch city list: ${res.status}`);

  const body = await res.json();
  const items: Array<{
    city_id: string;
    city_name: string;
    city_slug: string;
    stateId: number;
    state_code: string;
  }> = body?.city_list ?? [];

  return items
    .map((item) => ({
      id: item.city_id,
      name: item.city_name,
      slug: item.city_slug,
      stateId: item.stateId,
      stateCode: item.state_code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const REG_LOOKUP_URL = 'https://vehicle-service-stage.qac24svc.dev/v1/2025-09/vehicle-number';

/**
 * Basic credential for the vehicle-service RC lookup. Kept in an env var rather
 * than the source so it stays out of git history. Being a PUBLIC_ var it is
 * still inlined into the client bundle at build time, which is unavoidable
 * while the site is statically hosted and the browser calls the API directly.
 */
const REG_AUTH = import.meta.env.PUBLIC_C24_VEHICLE_AUTH;

export interface RegLookup {
  registrationNumber: string;
  makeId: string | null;
  makeName: string | null;
  modelId: string | null;
  modelName: string | null;
  variantId: string | null;
  variantName: string | null;
  /** Bare trim name ("LP") used to match a variant when the id is year-scoped. */
  variantCode: string | null;
  fuelType: string | null;
  transmissionType: string | null;
  /** Present when the MMV came from the ds_details prediction rather than the RC. */
  mmvConfidence: number | null;
  year: string | null;
  cityId: string | null;
  stateId: number | null;
  /** Pricing expects an unpunctuated code ("DL03"); the RC returns "DL-03". */
  rtoCode: string | null;
  manufacturingDate: string | null;
  insuranceDate: string | null;
  ownershipNumber: string | null;
  color: string | null;
  /** Raw RC model string, shown when the catalogue MMV block is absent. */
  rcModel: string | null;
}

export class RegNotFoundError extends Error {}

/**
 * Looks up a vehicle by registration number. `vehicleMmv` comes back null for
 * plates the catalogue cannot resolve, so every MMV field is optional and the
 * caller prefills whatever is present.
 */
export async function fetchVehicleByReg(reg: string): Promise<RegLookup> {
  if (!REG_AUTH) throw new Error('Registration lookup is not configured.');

  const res = await fetch(`${REG_LOOKUP_URL}/${encodeURIComponent(reg)}`, {
    headers: {
      'Content-Type': 'application/json',
      x_basic_a: REG_AUTH,
      platform: 'seller',
      origin_source: 'c2b-website',
      device_category: 'mSite',
    },
  });

  if (res.status === 404) throw new RegNotFoundError('No record found for that registration number.');
  if (!res.ok) throw new Error(`Registration lookup failed: ${res.status}`);

  const body = await res.json();
  if (!body?.success || !body?.detail) throw new RegNotFoundError('No record found for that registration number.');

  const d = body.detail;
  const mmv = d.vehicleMmv ?? null;
  // vehicleMmv is frequently null; ds_details carries a scored prediction of the
  // same make/model/variant, so it serves as the fallback. Its variant id is
  // scoped to a different year bucket, hence variantCode for name matching.
  const ds = Array.isArray(d.ds_details) && d.ds_details.length ? d.ds_details[0] : null;
  const dsv = ds?.variant ?? null;
  const str = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));

  return {
    registrationNumber: str(d.registrationNumber) ?? reg,
    makeId: str(mmv?.makeId) ?? str(ds?.make_id),
    makeName: str(mmv?.makeDisplay) ?? str(d.brand?.make_display),
    modelId: str(mmv?.modelId) ?? str(ds?.model_id),
    modelName: str(mmv?.modelDisplay) ?? str(d.model?.model_display),
    variantId: str(mmv?.variantId) ?? str(dsv?.variant_id),
    variantName: str(mmv?.variantDisplayName) ?? str(dsv?.variant_display_name),
    variantCode: str(dsv?.variant_name),
    fuelType: str(mmv?.fuelType) ?? str(dsv?.fuel_type) ?? str(d.fuelType),
    transmissionType: str(mmv?.transmissionType) ?? str(dsv?.transmission_type),
    mmvConfidence: !mmv && typeof ds?.confidence_score === 'number' ? ds.confidence_score : null,
    year: str(d.year?.year) ?? str(d.regn_year),
    cityId: str(d.RTO?.city_id),
    stateId: typeof d.states?.state_id === 'number' ? d.states.state_id : null,
    rtoCode: str(d.RTO?.rto_code)?.replace(/[^A-Z0-9]/gi, '') ?? null,
    manufacturingDate: str(d.manufacturingMonthYr),
    insuranceDate: str(d.insuranceUpTo),
    ownershipNumber: str(d.rc_owner_sr),
    color: str(d.color),
    rcModel: str(d.rc_model),
  };
}

const PRICING_URL = 'https://c24-bff-service-stage.qac24svc.dev/api/v1/fgvge-pricing';

// Fixed condition ratings sent upstream. The response returns quote bands for
// every condition tier regardless of this input, so it only seeds the model;
// the actual condition the user picks is applied client-side against those bands.
const DEFAULT_RATING = 8;

export interface PriceBand {
  low: number;
  high: number;
}

export interface PricingResult {
  low: number;
  high: number;
  byCondition: {
    fair: PriceBand;
    good: PriceBand;
    veryGood: PriceBand;
    excellent: PriceBand;
  };
  comparables: number;
}

export interface PricingInput {
  variantId: string;
  year: number;
  fuelType: string;
  transmissionType: string;
  kms: number;
  cityId: string;
  stateId: number;
  rtoCode: string;
  /**
   * Real values from an RC lookup when the user auto-detected their car.
   * Absent on the manual path, where they fall back to derived defaults.
   */
  manufacturingDate?: string | null;
  insuranceDate?: string | null;
  ownershipNumber?: string | null;
  color?: string | null;
}

/** Local-date YYYY-MM-DD. toISOString() would shift the day for IST users. */
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** crypto.randomUUID is only defined in secure contexts; fall back for plain-http dev hosts. */
function requestToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function requestPricing(input: PricingInput): Promise<PricingResult> {
  const now = new Date();
  const insuranceDate = isoDate(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()));

  const res = await fetch(PRICING_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      variant_id: Number(input.variantId),
      year: input.year,
      manufacturing_date: input.manufacturingDate ?? `01/${input.year}`,
      state_id: input.stateId,
      kms: input.kms,
      odo_optional: 0,
      rto_code: input.rtoCode,
      userStateId: input.stateId,
      fuelType: input.fuelType,
      transmissionType: input.transmissionType,
      ex_showroom_price: 0,
      token: requestToken(),
      channel_partner_token: 'NA',
      city_id: Number(input.cityId),
      test_type: 'CONTROL',
      color: input.color ?? '',
      insurance_date: input.insuranceDate ?? insuranceDate,
      ownership_number: input.ownershipNumber ?? 'NA',
      priceExplainer: 0,
      similar_car_exp: 1,
      source_identifier: 'c2b_cars24',
      interiorRating: DEFAULT_RATING,
      exteriorRating: DEFAULT_RATING,
      engineRating: DEFAULT_RATING,
      documentsRating: DEFAULT_RATING,
      v2_quote: 1,
    }),
  });

  const body = await res.json();
  if (!res.ok || body.error) {
    throw new Error(body.detail || body.error || `Pricing request failed: ${res.status}`);
  }

  const price = body.price ?? {};
  return {
    low: price.min_quote_price ?? 0,
    high: price.max_quote_price ?? 0,
    byCondition: {
      fair: { low: price.fair_min_quote_price ?? 0, high: price.fair_max_quote_price ?? 0 },
      good: { low: price.good_min_quote_price ?? 0, high: price.good_max_quote_price ?? 0 },
      veryGood: { low: price.very_good_min_quote_price ?? 0, high: price.very_good_max_quote_price ?? 0 },
      excellent: { low: price.excellent_min_quote_price ?? 0, high: price.excellent_max_quote_price ?? 0 },
    },
    comparables: Object.keys(body.similar_cars ?? {}).length,
  };
}

/**
 * The upstream model server cold-starts: the first request after an idle period
 * fails with a gateway-level "context deadline exceeded", and an immediate retry
 * then succeeds. Retrying absorbs that instead of showing the user an error.
 */
export async function fetchPricing(input: PricingInput, attempts = 3): Promise<PricingResult> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await requestPricing(input);
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}
