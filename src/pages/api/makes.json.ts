import type { APIRoute } from 'astro';
import { fetchVehicleScreenItems } from '../../lib/cars24';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const makes = await fetchVehicleScreenItems('make_screen', 'make');
    return new Response(JSON.stringify(makes), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch makes' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
