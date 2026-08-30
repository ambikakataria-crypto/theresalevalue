// Author registry.
// Only real, verified authors ship. Dummy / placeholder profiles are not
// created here. Add new authors below as their profiles are supplied.

export interface Author {
  slug: string;
  name: string;
  role: string;              // job title / editorial role
  credentials?: string;      // e.g. "IRDAI licence #12345" or "CA, ex-HDFC ERGO"
  bio: string;               // 2–4 line bio for byline hover / footer
  longBio?: string;          // full profile-page bio
  expertise: string[];       // topic tags
  yearsExperience?: number;
  linkedin?: string;
  twitter?: string;
  email?: string;
  photo?: string;            // /authors/{slug}.jpg
  isPlaceholder?: boolean;   // kept for backwards-compat; always false for real authors
}

export const authors: Record<string, Author> = {
  'vaishnav-mishra': {
    slug: 'vaishnav-mishra',
    name: 'Vaishnav Mishra',
    role: 'Head of Data Science',
    credentials: '15+ years across data science, AI and advanced analytics; leads the Pricing Science function at The Resale Value.',
    bio: "Vaishnav Mishra is Head of Data Science at The Resale Value, where he leads the Pricing Science function behind the site's vehicle valuation platform. He brings 15+ years across data science, AI and advanced analytics, and writes about used-car pricing, depreciation, and the data-driven factors that influence resale value.",
    longBio: "Vaishnav Mishra is the Head of Data Science at The Resale Value, where he leads the company's Pricing Science function and is responsible for the intelligence behind its vehicle valuation platform. He oversees the development of pricing models, depreciation frameworks, market-signal integration, and AI-driven methodologies that keep resale estimates accurate, transparent, and responsive to changing market conditions. With more than 15 years of experience across data science, artificial intelligence, and advanced analytics, Vaishnav has built and scaled decision intelligence solutions across fintech, telecom, finance, pharmaceuticals, energy, and high-growth technology businesses.\n\nAt The Resale Value, Vaishnav focuses on making vehicle pricing both scientifically rigorous and easy to understand. He writes about used-car pricing, depreciation, valuation methodologies, and the data-driven factors that influence resale value, helping buyers and sellers understand not just what a vehicle is worth, but why. He is also the author of <a href=\"https://www.linkedin.com/newsletters/the-shift-data-ai-strategy-7375123933840265217/\" target=\"_blank\" rel=\"noopener\" class=\"text-signal-600 hover:underline\">The Shift: Data, AI &amp; Strategy</a>, a LinkedIn newsletter exploring the intersection of data science, AI, and business strategy, where he advocates for transparent, explainable, and evidence-based decision-making.\n\nBeyond automotive, Vaishnav writes passionately on <a href=\"https://vaishnavspeaks.wordpress.com/\" target=\"_blank\" rel=\"noopener\" class=\"text-signal-600 hover:underline\">topics related to Data Science</a> on his personal blog.",
    expertise: ['used-car pricing', 'depreciation frameworks', 'vehicle valuation models', 'pricing methodology', 'AI & advanced analytics'],
    linkedin: 'https://www.linkedin.com/in/vaishnavmishra/',
    photo: '/authors/vaishnav-mishra.jpg',
    isPlaceholder: false,
  },
};

// Reviewer registry, kept empty until a real IRDAI-licensed advisor or CA
// is engaged. Byline components must handle an unknown slug gracefully.
export const reviewers: Record<string, Author> = {};

export function getAuthor(slug: string): Author | null {
  return authors[slug] ?? null;
}

export function getReviewer(slug: string): Author | null {
  return reviewers[slug] ?? null;
}
