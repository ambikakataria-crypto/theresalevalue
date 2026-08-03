import type { APIRoute } from 'astro';
import { fetchCityList } from '../../lib/cars24';

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const cities = await fetchCityList();
    return new Response(JSON.stringify(cities), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch cities' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
