import type { APIRoute } from 'astro';

// Runs on demand so the model-server credential stays on the server. Every
// other route in this project is still prerendered.
export const prerender = false;

const PREDICT_URL =
  'https://modelserve.c24mlplatform-qa.com/serving/fgvge-pricing/fgvge-pricing/v1/models/fgvge_pricing:predict';

// The Istio gateway in front of the model server intermittently answers a valid
// token with "RBAC: access denied"; an immediate retry succeeds. Roughly one
// call in four needed one during testing.
const ATTEMPTS = 3;

// state_id is mandatory upstream, so an unknown city still needs a value.
const FALLBACK_STATE_ID = 16;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function posInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** "24%" -> 24. The model returns each bucket as a percentage string. */
function depPercent(value: unknown): number | null {
  const n = Number(String(value ?? '').replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
}

export const POST: APIRoute = async ({ request }) => {
  // process.env first so rotating the token in Vercel takes effect without a
  // redeploy; import.meta.env is what `astro dev` populates from .env.
  const token = process.env.C24_MODELSERVE_TOKEN ?? import.meta.env.C24_MODELSERVE_TOKEN;
  if (!token) return json({ error: 'Pricing model is not configured.' }, 503);

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const variantId = posInt(input.variantId);
  const year = posInt(input.year);
  const exShowroomPrice = posInt(input.exShowroomPrice);
  const kms = posInt(input.kms);
  if (!variantId || !year || !exShowroomPrice || !kms) {
    return json({ error: 'variantId, year, exShowroomPrice and kms are required.' }, 400);
  }

  // Only the fields the model actually reacts to. Dropping ex_showroom_price
  // empties dep_report, dropping manufacturing_date truncates the table at age
  // 7, and kms and state_id are both rejected outright when missing. Built
  // field by field rather than forwarding the caller's body, so this route
  // cannot hand arbitrary payloads to the internal service.
  const upstream = {
    kms,
    year: String(year),
    variant_id: variantId,
    ex_showroom_price: exShowroomPrice,
    manufacturing_date: `3/${year}`,
    state_id: posInt(input.stateId) ?? FALLBACK_STATE_ID,
  };

  let lastError = 'Pricing model did not respond.';

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500));

    let body: any;
    try {
      const res = await fetch(PREDICT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(upstream),
      });
      const text = await res.text();
      if (!res.ok) {
        lastError = `Pricing model returned ${res.status}.`;
        continue;
      }
      body = JSON.parse(text);
    } catch {
      lastError = 'Pricing model did not respond.';
      continue;
    }

    // Depreciation percent keyed by vehicle age. The model reports only the
    // buckets up to the queried car's age, so an old year yields the most.
    const yearlyDep: Record<string, number> = {};
    for (const [bucket, pct] of Object.entries(body?.dep_report?.yearly_dep ?? {})) {
      const age = posInt(String(bucket).replace('year', ''));
      const percent = depPercent(pct);
      if (age && percent !== null) yearlyDep[String(age)] = percent;
    }

    return json({ yearlyDep });
  }

  return json({ error: lastError }, 502);
};
