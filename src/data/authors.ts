// Author registry, prototype
// Swap placeholder profiles with real writer bios/photos when profiles arrive.
// Every YMYL blog (finance, insurance) should list an author + a reviewer.

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
  photo?: string;            // /authors/{slug}.jpg, placeholder until profiles arrive
  isPlaceholder?: boolean;   // flags prototype rows for easy replacement
}

export const authors: Record<string, Author> = {
  'editorial-team': {
    slug: 'editorial-team',
    name: 'TheResaleValue Editorial Team',
    role: 'Editorial desk',
    bio: 'The TheResaleValue editorial desk covers Indian used-car valuation, depreciation, scrappage policy, and vehicle ownership economics. Every article is checked against public regulatory sources (MoRTH, IRDAI, RBI, CPCB) before publication.',
    longBio: 'The TheResaleValue editorial desk is a team of Indian automotive writers and researchers covering used-car valuation methodology, depreciation curves, MoRTH scrappage policy, and vehicle ownership economics. All published pieces are cross-checked against public regulatory documents from MoRTH, IRDAI, RBI, CPCB, and the National Green Tribunal.',
    expertise: ['used-car valuation', 'depreciation', 'scrappage', 'ownership costs'],
    email: 'editorial@theresalevalue.com',
    isPlaceholder: true,
  },
  'a-verma': {
    slug: 'a-verma',
    name: 'A. Verma',
    role: 'Senior automotive writer',
    credentials: 'Automotive industry background · [credentials pending]',
    bio: 'Covers used-car pricing, depreciation, and Indian resale dynamics. [Full profile to be added.]',
    longBio: 'Placeholder profile, a real bio, credentials, LinkedIn, and photo will replace this once the writer profile is supplied. Beat: used-car valuation, model-wise depreciation, resale value trends across Indian metros.',
    expertise: ['used-car pricing', 'depreciation', 'resale trends'],
    isPlaceholder: true,
  },
  'r-nair': {
    slug: 'r-nair',
    name: 'R. Nair',
    role: 'Contributing writer, insurance & finance',
    credentials: '[Insurance/finance credentials pending]',
    bio: 'Writes on motor insurance mechanics, IDV, and car-loan economics for Indian buyers. [Full profile to be added.]',
    longBio: 'Placeholder profile, a real bio, credentials (e.g. IRDAI licence, CA, or ex-insurer role), LinkedIn, and photo will replace this once the writer profile is supplied. Beat: motor insurance (IDV, depreciation schedule, claim mechanics), car-loan structuring, and finance economics for Indian car buyers.',
    expertise: ['motor insurance', 'IDV', 'car loans', 'personal finance'],
    isPlaceholder: true,
  },
  's-iyer': {
    slug: 's-iyer',
    name: 'S. Iyer',
    role: 'Policy & regulation writer',
    credentials: '[Policy credentials pending]',
    bio: 'Tracks Indian vehicle scrappage policy, NGT rulings, and RTO frameworks. [Full profile to be added.]',
    longBio: 'Placeholder profile, a real bio, credentials, LinkedIn, and photo will replace this once the writer profile is supplied. Beat: MoRTH scrappage policy (G.S.R. 653(E)), National Green Tribunal end-of-life vehicle rules, state RTO frameworks, and CPCB norms.',
    expertise: ['scrappage policy', 'RTO rules', 'NGT rulings', 'MoRTH'],
    isPlaceholder: true,
  },
  'vaishnav-mishra': {
    slug: 'vaishnav-mishra',
    name: 'Vaishnav Mishra',
    role: 'Head of Pricing Science',
    credentials: '15+ years in data science, AI and advanced analytics; leads pricing science at The Resale Value.',
    bio: "Vaishnav Mishra is Head of Pricing Science at The Resale Value. He brings more than 15 years in data science, AI and advanced analytics to the models and methods behind the site's resale-value analysis. He writes about used-car pricing, depreciation curves, model updates and the assumptions that can move a valuation.",
    longBio: "Vaishnav Mishra is Head of Pricing Science at The Resale Value, where he leads the work that connects pricing models to plain-English resale guidance. His remit includes calibrating depreciation curves, running monthly model-retraining cycles and keeping the site's price-adjustment methodology current when the market moves. He brings more than 15 years of experience in data science, AI and advanced analytics, with a background spanning growth, fintech, telecom, finance, pharma and energy.\n\nAt The Resale Value, Vaishnav focuses on how a vehicle's age, ownership cycle and market signals turn into a price estimate. He writes about used-car pricing, depreciation, valuation models, methodology changes and the assumptions readers should question before using any resale-value number. His public work includes The Shift: Data, AI & Strategy, a biweekly LinkedIn newsletter for a data and AI audience. His focus is to make the reasoning visible: what changed, why it changed and what the update means for a buyer or seller, rather than treating the output as an unexplained score.",
    expertise: ['used-car pricing', 'depreciation curves', 'vehicle valuation models', 'pricing methodology', 'automotive data science'],
    linkedin: 'https://www.linkedin.com/in/vaishnavmishra/',
    photo: '/authors/vaishnav-mishra.jpg',
    isPlaceholder: false,
  },
};

// Reviewer registry, for YMYL "reviewed by" credit line.
// Swap in a real IRDAI-licensed advisor / CA when engaged.
export const reviewers: Record<string, Author> = {
  'compliance-reviewer': {
    slug: 'compliance-reviewer',
    name: 'Reviewer TBD',
    role: 'Independent reviewer (finance/insurance)',
    credentials: '[IRDAI-licensed advisor / CA, to be engaged]',
    bio: 'YMYL content on this site is intended to be reviewed by an independent IRDAI-licensed advisor or Chartered Accountant before publication. This role is currently open, reach out to editorial@theresalevalue.com.',
    expertise: ['motor insurance compliance', 'personal finance'],
    isPlaceholder: true,
  },
};

export function getAuthor(slug: string): Author {
  return authors[slug] ?? authors['editorial-team'];
}

export function getReviewer(slug: string): Author | null {
  return reviewers[slug] ?? null;
}
