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
      manufacturing_date: `01/${input.year}`,
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
      color: '',
      insurance_date: insuranceDate,
      ownership_number: 'NA',
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
