// Single source of truth for the /blogs listing.
// Newest first at render (sorted by `date` desc).
// Rows with `queued: true` are hidden from the listing until the publish routine
// unqueues them and stamps them with today's date.
//
// TO ADD A NEW BLOG:
//   1. Create src/pages/blogs/<slug>.astro. The page reads its display date
//      by looking up its slug in `rawArticles` — do NOT hardcode <time> strings.
//   2. Add a row below with `queued: true` and `date: ''` (any position;
//      the list is sorted at render).
//   3. Push. The blog stays hidden from /blogs until the publish routine runs.
//
// TO PUBLISH A QUEUED BLOG:
//   Run the `trv-blog-publish` routine from the Routines panel. It picks the
//   first `queued: true` entry, sets its `date` to today's ISO, flips
//   `queued: false`, adds a `blog-lastmod` entry, and pushes. Vercel rebuilds
//   and the blog appears on /blogs with today as its publish date.

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;         // ISO YYYY-MM-DD. Empty string if still queued.
  readTime: string;
  category: string;
  featured?: boolean;
  queued?: boolean;     // If true, hidden from /blogs listing until publish routine flips it.
};

export const BLOG_PAGE_SIZE = 5;

// Full registry, published and queued alike. Blog pages import this to look up
// their own display date by slug so the date is never hardcoded in the .astro.
export const rawArticles: BlogArticle[] = [
  {
    slug: 'used-car-valuation-india',
    title: 'Used car valuation India: check your car\'s fair-price band free',
    excerpt: 'Why the same car returns three different valuations across three websites, and how to read a fair-price band instead of chasing a single number. Six factors ranked by actual price impact, city-level trends, and the private-vs-dealer-vs-instant-buyer decision.',
    date: '2026-07-28',
    readTime: '12 min read',
    category: 'Valuation · Pillar',
    featured: true,
  },
  {
    slug: 'new-car-depreciation-india',
    title: 'New car depreciation in India: year-by-year resale value data and calculator',
    excerpt: 'Segment-wise depreciation curves for hatchback, sedan, SUV, luxury, and EV, from year 1 to year 10. Why standard depreciation formulas fail in India, when to sell (year 3 vs year 5), and how IDV differs from actual resale.',
    date: '2026-07-28',
    readTime: '14 min read',
    category: 'Depreciation · Pillar',
    featured: true,
  },
  {
    slug: 'how-to-check-used-car-value',
    title: 'How to check used car value in India: why every calculator shows a different price',
    excerpt: 'Every online tool returns a different used car value. The triangulation framework across algorithm calculators, marketplace listings, and dealer offers. How number-plate lookups fall short, and why calculators are accurate for hatchbacks but miss on diesel SUVs.',
    date: '2026-08-30',
    readTime: '10 min read',
    category: 'Valuation · How-to',
  },
  {
    slug: 'idv-calculator-india',
    title: 'IDV calculator India: how insured declared value is calculated and where it falls short of market value',
    excerpt: 'The IRDAI depreciation schedule (5/15/20/30/40/50%), how post-detariffing gives insurers flexibility, why IDV drops every year, and where it diverges from actual resale on Maruti, Hyundai, and Toyota models. What the total loss cheque really works out to.',
    date: '2026-07-30',
    readTime: '10 min read',
    category: 'Insurance · Explainer',
  },
  {
    slug: 'car-loan-vs-resale-value',
    title: 'Car loan vs resale value: should you sell or keep paying EMIs in India?',
    excerpt: 'Break-even framework for selling a financed car. Amortisation vs depreciation curves, foreclosure charges by lender, hypothecation removal at RTO (Delhi vs Mumbai timelines), Form 35 traps, and what to do when the car is worth less than the outstanding balance.',
    date: '2026-07-30',
    readTime: '11 min read',
    category: 'Loan · Framework',
  },
  {
    slug: 'car-scrappage-value-india',
    title: 'Car scrappage value India: RVSF rates, policy rules & certificate of deposit (2026)',
    excerpt: 'RVSF payout by vehicle type, why the kabadiwala\'s cash offer looks better than it is, Certificate of Deposit concessions (up to 25% road tax rebate), state-wise breakdown, and the break-even between private sale and formal scrappage.',
    date: '2026-07-30',
    readTime: '12 min read',
    category: 'Scrappage · Guide',
  },
  {
    slug: 'factors-affecting-used-car-resale-value',
    title: 'What affects used car resale value in India: 10 factors ranked by rupee impact',
    excerpt: 'Age and kilometres set the base price. The other eight factors decide whether the final offer lands above or below that base. All ten ranked, with the ones an owner can still change on the day of sale.',
    date: '',
    readTime: '13 min read',
    category: 'Valuation · Analysis',
    queued: true,
  },
  {
    slug: 'fair-market-value-vs-asking-price-vs-dealer-offer',
    title: 'Fair market value vs asking price vs dealer offer: three prices for one car in India',
    excerpt: 'One car, three numbers, one fortnight in Pune. Why fair market value is a band, not a figure; what asking price actually reflects; how dealer offers are built; and where each rupee of the spread sits.',
    date: '',
    readTime: '11 min read',
    category: 'Valuation · Framework',
    queued: true,
  },
  {
    slug: 'private-vs-dealer-vs-instant-buy',
    title: 'Private vs dealer vs instant buy in India: what each route actually pays',
    excerpt: 'Three exit routes, three different net cheques for the same car. Ledger-level comparison of private sale, dealer trade-in and instant-buy, with paperwork timelines, NCB retention, and where the consignment option fits.',
    date: '',
    readTime: '12 min read',
    category: 'Selling · Framework',
    queued: true,
  },
  {
    slug: 'online-used-car-valuation-accuracy-india',
    title: 'How accurate are online used car valuations in India: a benchmark of 4 tools',
    excerpt: 'Cars24, Spinny, OLX and CarWale quotes compared against the price the seller actually received. Why the three engine types behind identical forms explain most of the spread, and how to read four quotes as a range instead of averaging them.',
    date: '',
    readTime: '13 min read',
    category: 'Valuation · Benchmark',
    queued: true,
  },
  {
    slug: 'kilometres-vs-age-used-car-resale',
    title: 'Kilometres vs age in used car resale: where the two curves cross in India',
    excerpt: 'Age discounts are fixed by the RC. Kilometre discounts can be argued down with paperwork. The 12,000 km/year line where one force takes over from the other, plus three inspection-bay profiles that show why segment matters.',
    date: '',
    readTime: '12 min read',
    category: 'Valuation · Analysis',
    queued: true,
  },
  {
    slug: 'best-time-to-sell-used-car-india',
    title: 'Best time to sell a used car in India: the month-by-month price index',
    excerpt: 'March and October pay for completely different reasons. The June-August trough is partly an inspection problem. Full 12-month price index, segment-wise best and worst months, and why Delhi, Mumbai, Bengaluru, Chennai and Kochi peak on different calendars.',
    date: '',
    readTime: '13 min read',
    category: 'Selling · Timing',
    queued: true,
  },
  {
    slug: 'used-car-resale-value-by-city-india',
    title: 'Used car resale value by city: Delhi vs Mumbai vs Bengaluru (2026 data)',
    excerpt: 'Same car, eight metros, eight different offers. Four levers that set the spread: remaining legal life, fuel-type buyer mix, city wear signature, and transfer friction. When crossing state lines actually pays, and when the road tax refund still sitting with the origin state closes the gap.',
    date: '',
    readTime: '14 min read',
    category: 'Valuation · City data',
    queued: true,
  },
  {
    slug: 'negotiating-private-used-car-sale-india',
    title: 'Negotiating a private used car sale in India: the buyer\'s playbook and its counters',
    excerpt: 'The four-move sequence most private buyers run to reduce an asking price, the split-the-difference trap, the documentation folder that stops arguments before they start, and the walkaway number worth writing down before the first buyer calls.',
    date: '',
    readTime: '13 min read',
    category: 'Selling · Negotiation',
    queued: true,
  },
  {
    slug: 'petrol-diesel-cng-resale-value-india',
    title: 'Petrol vs diesel vs CNG resale value in India: what the fuel badge alone is worth (2026)',
    excerpt: 'Fuel type does not have one resale value in India. It has a different one in each registration city. The NCR diesel rule, the Kochi control case, factory versus retrofitted CNG, the fuel-by-city grid, five-year retention by fuel, and when a retrofit actually recovers its cost.',
    date: '',
    readTime: '15 min read',
    category: 'Fuel · Analysis',
    queued: true,
  },
  {
    slug: 'maruti-suzuki-resale-value-india',
    title: 'Maruti Suzuki resale value in India: 10 models ranked by 5-year retention (2026)',
    excerpt: 'Roughly 20 percentage points separate the strongest-holding Maruti from the weakest at five years. The Maruti vs Hyundai brand gap is closer to 5. Ten models ranked, the variant trap, Nexa vs Arena, the city effect, and what a full inspection actually finds before an offer is made.',
    date: '',
    readTime: '16 min read',
    category: 'Model · Brand',
    queued: true,
  },
];

export const allBlogs: BlogArticle[] = rawArticles
  .filter((a) => !a.queued)
  .sort((a, b) => b.date.localeCompare(a.date));

// Helper for individual blog pages to render their own publish date without
// hardcoding a <time> string.
export function displayDateFor(slug: string): { iso: string; label: string } | null {
  const article = rawArticles.find((a) => a.slug === slug);
  if (!article || !article.date) return null;
  const d = new Date(article.date + 'T00:00:00');
  const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return { iso: article.date, label };
}
