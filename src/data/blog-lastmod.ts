// Blog lastmod registry ,feeds <lastmod> into the sitemap so Google + LLMs
// see real freshness. Update the ISO date whenever a blog is meaningfully
// revised (new sections, fresh data, updated regulation). Do NOT bump the
// date for typo fixes or small copy tweaks ,reserve for substantive updates.
//
// Any blog URL missing here falls back to build date (see astro.config.mjs).
// Non-blog pages (calculators, hubs) also fall back to build date.
//
// Queued blogs (those with queued: true in blogs.ts) are intentionally absent.
// The publish routine adds a lastmod entry when it unqueues each blog.

export const blogLastmod: Record<string, string> = {
  '/blogs/used-car-valuation-india/': '2026-07-28',
  '/blogs/new-car-depreciation-india/': '2026-07-28',
  '/blogs/how-to-check-used-car-value/': '2026-08-30',
  '/blogs/car-loan-vs-resale-value/': '2026-07-30',
  '/blogs/idv-calculator-india/': '2026-07-30',
  '/blogs/car-scrappage-value-india/': '2026-07-30',
  '/blogs/factors-affecting-used-car-resale-value/': '2026-08-31',
};
