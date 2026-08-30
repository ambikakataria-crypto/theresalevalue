// Single source of truth for the /blogs listing.
// Newest first at render (sorted by `date` desc).
// Future-dated `publishDate` blogs are hidden until that date.
//
// TO ADD A NEW BLOG:
//   1. Create src/pages/blogs/<slug>.astro.
//   2. Add a row below (any position; the list is sorted at render).
//   3. Add the URL + revision date to src/data/blog-lastmod.ts (sitemap lastmod).
//   4. Set `publishDate` to schedule the blog for a future daily slot.
//      A daily scheduled task pushes an empty commit at 06:30 IST so Vercel
//      rebuilds and unhides the day's slot. See ~/.claude/scheduled-tasks/trv-daily-blog-publish.
//   5. Push. @astrojs/sitemap picks up the new page automatically.

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;         // ISO YYYY-MM-DD (display date + sort order)
  readTime: string;
  category: string;
  featured?: boolean;
  publishDate?: string; // Optional ISO YYYY-MM-DD; if set and > today, blog is hidden from listing + sitemap
};

export const BLOG_PAGE_SIZE = 5;

const rawArticles: BlogArticle[] = [
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
    date: '2026-08-31',
    readTime: '13 min read',
    category: 'Valuation · Analysis',
    publishDate: '2026-08-31',
  },
  {
    slug: 'fair-market-value-vs-asking-price-vs-dealer-offer',
    title: 'Fair market value vs asking price vs dealer offer: three prices for one car in India',
    excerpt: 'One car, three numbers, one fortnight in Pune. Why fair market value is a band, not a figure; what asking price actually reflects; how dealer offers are built; and where each rupee of the spread sits.',
    date: '2026-09-01',
    readTime: '11 min read',
    category: 'Valuation · Framework',
    publishDate: '2026-09-01',
  },
];

const todayISO = new Date().toISOString().slice(0, 10);

export const allBlogs: BlogArticle[] = rawArticles
  .filter((a) => !a.publishDate || a.publishDate <= todayISO)
  .sort((a, b) => b.date.localeCompare(a.date));
