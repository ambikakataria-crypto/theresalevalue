// Single source of truth for the /blogs listing.
// Newest first at render (sorted by `date` desc).
//
// TO ADD A NEW BLOG:
//   1. Create src/pages/blogs/<slug>.astro.
//   2. Add a row below (any position; the list is sorted at render).
//   3. Add the URL + revision date to src/data/blog-lastmod.ts (sitemap lastmod).
//   4. Push. @astrojs/sitemap picks up the new page automatically.

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;       // ISO YYYY-MM-DD
  readTime: string;
  category: string;
  featured?: boolean;
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
];

export const allBlogs: BlogArticle[] = [...rawArticles].sort(
  (a, b) => b.date.localeCompare(a.date),
);
