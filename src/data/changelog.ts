// TheResaleValue public changelog
// Human-updated weekly. Each entry is a real, dated edit, no automation.
// Keep entries specific: "Refreshed Swift CNG bands +2% for Delhi liquidity"
// beats "Updated data".

export interface ChangelogEntry {
  date: string;              // ISO YYYY-MM-DD
  editor: string;            // Who made the change
  items: string[];           // 1-4 short bullets
}

export const changelog: ChangelogEntry[] = [
  {
    date: '2026-08-02',
    editor: 'The Editor',
    items: [
      'Reworked bylines and author pages after E-E-A-T review. Author profile pages set to noindex until real writer profiles are wired in.',
      'Added "The editor\'s take" callouts across the Swift model page and the four July blog posts. Dated, signed opinions sit above the AI-drafted data now.',
      'Published this changelog. Weekly updates from here.',
    ],
  },
  {
    date: '2026-07-31',
    editor: 'The Editor',
    items: [
      'Shipped the Maruti Swift reference make/model page, variant grid, city variance, on-page calculator running off a 50-permutation static JSON.',
      'Added mid-page CTA linking to the full valuation flow.',
    ],
  },
  {
    date: '2026-07-30',
    editor: 'The Editor',
    items: [
      'Published four July blogs: IDV calculator explainer, car loan vs resale, scrappage guide, and how-to-check-value.',
      'Applied YMYL hardening, non-licensed disclosure banners on the two insurance and finance posts.',
    ],
  },
];
