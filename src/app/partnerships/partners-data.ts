const SUPABASE_LOGOS =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos';

export type Partner = {
  id: string;
  name: string;
  tagline?: string;
  logoUrl?: string;
};

export type PartnerCategory = {
  id: string;
  label: string;
  description: string;
  partners: Partner[];
};

export type WhyUsItem = {
  id: string;
  title: string;
  body: string;
  badges?: string[];
  brandLabel?: string;
};

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    id: 'apparel',
    label: 'Apparel',
    description: 'From race-day kits to streetwear, athletes are repeat buyers of quality apparel.',
    partners: [
      { id: 'puma', name: 'Puma', logoUrl: `${SUPABASE_LOGOS}/puma-logo.webp` },
      { id: 'ua', name: 'Under Armour', logoUrl: `${SUPABASE_LOGOS}/under-armour-logo.webp` },
      { id: 'reebok', name: 'Reebok', logoUrl: `${SUPABASE_LOGOS}/reebok-logo.webp` },
      { id: 'boldfit', name: 'Boldfit', logoUrl: `${SUPABASE_LOGOS}/boldfit-logo.webp` },
      { id: 'tenxyou', name: 'TenxYou', logoUrl: `${SUPABASE_LOGOS}/tenxu-logo.webp` },
      { id: 'decathlon', name: 'Decathlon', logoUrl: `${SUPABASE_LOGOS}/decathlon-logo.webp` },
      { id: 'fuaark', name: 'Fuaark', logoUrl: `${SUPABASE_LOGOS}/fuaark-logo.webp` },
      {
        id: 'bearhouse',
        name: 'The Bear House',
        logoUrl: `${SUPABASE_LOGOS}/the-bear-house-logo.webp`,
      },
      { id: 'lifejam', name: 'Life & Jam', logoUrl: `${SUPABASE_LOGOS}/lifenjam-logo.webp` },
      { id: 'dizzyduck', name: 'DizzyDuck', logoUrl: `${SUPABASE_LOGOS}/dizzy-duck-logo.webp` },
    ],
  },
  {
    id: 'fnb',
    label: 'Food & Beverage',
    description:
      'Stride athletes fuel before, during, and after the run. They eat out, caffeinate, and celebrate together.',
    partners: [
      { id: 'redbull', name: 'Red Bull', logoUrl: `${SUPABASE_LOGOS}/red-bull-logo.webp` },
      {
        id: 'thirdwave',
        name: 'Third Wave Coffee',
        logoUrl: `${SUPABASE_LOGOS}/third-wave-coffee-logo.webp`,
      },
      { id: 'social', name: 'Social', logoUrl: `${SUPABASE_LOGOS}/social-logo.webp` },
      { id: 'mccafe', name: 'McCafe', logoUrl: `${SUPABASE_LOGOS}/mccafe-logo.webp` },
      { id: 'timhortons', name: 'Tim Hortons', logoUrl: `${SUPABASE_LOGOS}/tim-hortons-logo.webp` },
      { id: 'one8', name: 'One8Commune', logoUrl: `${SUPABASE_LOGOS}/one8-commune-logo.webp` },
      { id: 'paperpie', name: 'Paper & Pie', logoUrl: `${SUPABASE_LOGOS}/paper-n-pie-logo.webp` },
      { id: 'flaxcafe', name: 'Flax Cafe', logoUrl: `${SUPABASE_LOGOS}/flax-cafe-logo.webp` },
      { id: 'suzyq', name: 'SuzyQ', logoUrl: `${SUPABASE_LOGOS}/suzyq-logo.webp` },
      { id: 'amadora', name: 'Amadora', logoUrl: `${SUPABASE_LOGOS}/amadora-logo.webp` },
      { id: 'beanlore', name: 'Beanlore', logoUrl: `${SUPABASE_LOGOS}/beanlore-logo.webp` },
      {
        id: 'davebusters',
        name: "Dave & Buster's",
        logoUrl: `${SUPABASE_LOGOS}/dave-n-busters-logo.webp`,
      },
      {
        id: 'filtercoffee',
        name: 'The Filter Coffee',
        logoUrl: `${SUPABASE_LOGOS}/the-filter-coffee-logo.webp`,
      },
      { id: 'shiro', name: 'Shiro', logoUrl: `${SUPABASE_LOGOS}/shiro-logo.webp` },
      { id: 'hocco', name: 'Hocco Ice Cream', logoUrl: `${SUPABASE_LOGOS}/hocco-logo.webp` },
      { id: 'saladdays', name: 'Salad Days', logoUrl: `${SUPABASE_LOGOS}/salad-days-logo.webp` },
    ],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Performance nutrition for athletes who train every week and demand results.',
    partners: [
      { id: 'fastup', name: 'Fast&Up', logoUrl: `${SUPABASE_LOGOS}/fast-n-up-logo.webp` },
      { id: 'myprotein', name: 'My Protein', logoUrl: `${SUPABASE_LOGOS}/myprotein-logo.webp` },
      { id: 'muscleblaze', name: 'Muscleblaze', logoUrl: `${SUPABASE_LOGOS}/muscleblaze-logo.webp` },
      { id: 'gnc', name: 'GNC', logoUrl: `${SUPABASE_LOGOS}/gnc-logo.webp` },
      { id: 'superyou', name: 'Super You', logoUrl: `${SUPABASE_LOGOS}/superyou-logo.webp` },
      { id: 'trunativ', name: 'Trunativ', logoUrl: `${SUPABASE_LOGOS}/trunativ-logo.webp` },
      { id: 'milld', name: 'Milld', logoUrl: `${SUPABASE_LOGOS}/milld-logo.webp` },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    description:
      "From GPS wearables to quick commerce, Stride's community lives an active, tech-forward life.",
    partners: [
      // Self-hosted copy of the Simple Icons glyph — a genuine single-path
      // vector, unlike the other logos. Kept on our own storage so Vercel's
      // image optimizer can fetch it (it rejects unlisted external hosts).
      { id: 'garmin', name: 'Garmin', logoUrl: `${SUPABASE_LOGOS}/garmin-logo.svg` },
      { id: 'zepto', name: 'Zepto', logoUrl: `${SUPABASE_LOGOS}/zepto-logo.webp` },
      { id: 'ponds', name: "Pond's", logoUrl: `${SUPABASE_LOGOS}/ponds-logo.webp` },
      {
        id: 'narayana',
        name: 'Narayana Clinic',
        logoUrl: `${SUPABASE_LOGOS}/narayana-clinic-logo.webp`,
      },
      { id: 'tribit', name: 'Tribit', logoUrl: `${SUPABASE_LOGOS}/tribit-logo.webp` },
      {
        id: 'fourthfrontier',
        name: 'Fourth Frontier',
        logoUrl: `${SUPABASE_LOGOS}/fourth-frontier-logo.webp`,
      },
      { id: 'hyrox', name: 'HYROX', logoUrl: `${SUPABASE_LOGOS}/hyrox-logo.webp` },
      { id: 'bumble', name: 'Bumble', logoUrl: `${SUPABASE_LOGOS}/bumble-logo.webp` },
      { id: 'neutrogena', name: 'Neutrogena', logoUrl: `${SUPABASE_LOGOS}/neutrogena-logo.webp` },
      { id: 'supertails', name: 'Supertails', logoUrl: `${SUPABASE_LOGOS}/supertails-logo.webp` },
      { id: 'myop', name: 'Make Your Own Perfume', logoUrl: `${SUPABASE_LOGOS}/myop-logo.webp` },
      { id: 'niantic', name: 'Niantic', logoUrl: `${SUPABASE_LOGOS}/niantic-logo.webp` },
      { id: 'hyfit', name: 'Hyfit', logoUrl: `${SUPABASE_LOGOS}/hyfit-logo.webp` },
      { id: 'chakra', name: 'Chakra Athletica', logoUrl: `${SUPABASE_LOGOS}/chakra-logo.webp` },
      {
        id: 'wellnessco',
        name: 'The Wellness Co',
        logoUrl: `${SUPABASE_LOGOS}/the-wellness-co-logo.webp`,
      },
    ],
  },
];

/** All partners flattened — used by the marquee */
export const ALL_PARTNERS: Partner[] = PARTNER_CATEGORIES.flatMap((c) => c.partners);

export const WHY_US: WhyUsItem[] = [
  {
    id: 'audience',
    title: 'High-Intent Audience',
    body: 'Active buyers who spend on fitness gear, nutrition, and recovery every week, and take their health seriously.',
    badges: ['22–35 yr urban professionals', 'Equal gender ratio'],
  },
  {
    id: 'creators',
    title: 'Pro Creator Community',
    body: "We nurture a community of UGC fitness creators who are regulars at our runs, making the kind of authentic content money can't manufacture.",
    badges: ['50+ UGC creators', 'Organic reach'],
  },
  {
    id: 'irl',
    title: 'Real-World Brand Moments',
    body: 'Among the only social run clubs in India running three times a week across beginner, intermediate, and advanced formats. Your brand shows up at every one of them.',
    badges: ['3 runs per week', 'All athlete levels'],
  },
  {
    id: 'women',
    title: 'Women-Only Sub-Community',
    body: 'A dedicated run and lifestyle club led by women, for women. Reach a highly engaged, underserved audience where fitness meets lifestyle.',
    brandLabel: 'Stride Like a Woman',
  },
];

export const WHATSAPP_LINK =
  'https://wa.me/918368877289?text=Hi%20Stride%20Run%20Club!%20I%20am%20interested%20in%20exploring%20a%20brand%20partnership.%20Please%20share%20more%20details.';
