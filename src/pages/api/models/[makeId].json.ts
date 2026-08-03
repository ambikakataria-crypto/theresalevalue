import type { APIRoute, GetStaticPaths } from 'astro';
import { fetchVehicleScreenItems } from '../../../lib/cars24';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const makes = await fetchVehicleScreenItems('make_screen', 'make');
  return makes.map((make) => ({ params: { makeId: make.id } }));
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const models = await fetchVehicleScreenItems('model_screen', 'model', {
      make: params.makeId!,
    });
    return new Response(JSON.stringify(models), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
