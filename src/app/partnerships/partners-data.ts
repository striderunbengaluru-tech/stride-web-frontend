const SUPABASE_LOGOS = 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/logos'

export type Partner = {
  id: string
  name: string
  tagline?: string
  logoUrl?: string
}

export type PartnerCategory = {
  id: string
  label: string
  description: string
  partners: Partner[]
}

export type WhyUsItem = {
  id: string
  title: string
  body: string
  badges?: string[]
  brandLabel?: string
}

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    id: 'apparel',
    label: 'Apparel',
    description: 'From race-day kits to streetwear — runners are repeat buyers of quality apparel.',
    partners: [
      { id: 'puma',        name: 'Puma',           logoUrl: `${SUPABASE_LOGOS}/puma-logo.svg` },
      { id: 'ua',          name: 'Under Armour',   logoUrl: `${SUPABASE_LOGOS}/under-armour-logo.svg` },
      { id: 'reebok',      name: 'Reebok',         logoUrl: `${SUPABASE_LOGOS}/reebok-logo.svg` },
      { id: 'boldfit',     name: 'Boldfit',        logoUrl: `${SUPABASE_LOGOS}/boldfit-logo.svg` },
      { id: 'tenxyou',     name: 'TenxYou',        logoUrl: `${SUPABASE_LOGOS}/tenxu-logo.svg` },
      { id: 'decathlon',   name: 'Decathlon',      logoUrl: `${SUPABASE_LOGOS}/decathlon-logo.svg` },
      { id: 'fuaark',      name: 'Fuaark',         logoUrl: `${SUPABASE_LOGOS}/fuaark-logo.svg` },
      { id: 'bearhouse',   name: 'The Bear House', logoUrl: `${SUPABASE_LOGOS}/the-bear-house-logo.svg` },
      { id: 'lifejam',     name: 'Life & Jam',     logoUrl: `${SUPABASE_LOGOS}/lifenjam-logo.svg` },
      { id: 'dizzyduck',   name: 'DizzyDuck',      logoUrl: `${SUPABASE_LOGOS}/dizzy-duck-logo.svg` },
    ],
  },
  {
    id: 'fnb',
    label: 'Food & Beverage',
    description: 'Fuel before, during, and after the run — Stride runners eat out, caffeinate, and celebrate together.',
    partners: [
      { id: 'redbull',    name: 'Red Bull',         logoUrl: `${SUPABASE_LOGOS}/red-bull-logo.svg` },
      { id: 'thirdwave',  name: 'Third Wave Coffee', logoUrl: `${SUPABASE_LOGOS}/third-wave-coffee-logo.svg` },
      { id: 'social',     name: 'Social',            logoUrl: `${SUPABASE_LOGOS}/social-logo.svg` },
      { id: 'mccafe',     name: 'McCafe',            logoUrl: `${SUPABASE_LOGOS}/mccafe-logo.svg` },
      { id: 'timhortons', name: 'Tim Hortons',       logoUrl: `${SUPABASE_LOGOS}/tim-hortons-logo.svg` },
      { id: 'one8',       name: 'One8Commune',       logoUrl: `${SUPABASE_LOGOS}/one8-commune-logo.svg` },
      { id: 'paperpie',   name: 'Paper & Pie',       logoUrl: `${SUPABASE_LOGOS}/paper-n-pie-logo.svg` },
      { id: 'flaxcafe',   name: 'Flax Cafe',         logoUrl: `${SUPABASE_LOGOS}/flax-cafe-logo.svg` },
      { id: 'suzyq',      name: 'SuzyQ',             logoUrl: `${SUPABASE_LOGOS}/suzyq-logo.svg` },
      { id: 'amadora',    name: 'Amadora',           logoUrl: `${SUPABASE_LOGOS}/amadora-logo.svg` },
      { id: 'beanlore',   name: 'Beanlore',          logoUrl: `${SUPABASE_LOGOS}/beanlore-logo.svg` },
    ],
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Performance nutrition for athletes who train every week and demand results.',
    partners: [
      { id: 'fastup',      name: 'Fast&Up',     logoUrl: `${SUPABASE_LOGOS}/fast-n-up-logo.svg` },
      { id: 'myprotein',   name: 'My Protein',  logoUrl: `${SUPABASE_LOGOS}/myprotein-logo.svg` },
      { id: 'muscleblaze', name: 'Muscleblaze', logoUrl: `${SUPABASE_LOGOS}/muscleblaze-logo.svg` },
      { id: 'gnc',         name: 'GNC',         logoUrl: `${SUPABASE_LOGOS}/gnc-logo.svg` },
      { id: 'superyou',    name: 'Super You',   logoUrl: `${SUPABASE_LOGOS}/superyou-logo.svg` },
      { id: 'trunativ',    name: 'Trunativ',    logoUrl: `${SUPABASE_LOGOS}/trunativ-logo.svg` },
      { id: 'milld',       name: 'Milld',       logoUrl: `${SUPABASE_LOGOS}/milld-logo.svg` },
    ],
  },
  {
    id: 'others',
    label: 'Others',
    description: "From GPS wearables to quick commerce — Stride's community lives an active, tech-forward lifestyle.",
    partners: [
      { id: 'garmin',          name: 'Garmin',          logoUrl: 'https://cdn.simpleicons.org/garmin' },
      { id: 'zepto',           name: 'Zepto',           logoUrl: `${SUPABASE_LOGOS}/zepto-logo.svg` },
      { id: 'ponds',          name: "Pond's",          logoUrl: `${SUPABASE_LOGOS}/ponds-logo.svg` },
      { id: 'narayana',       name: 'Narayana Clinic', logoUrl: `${SUPABASE_LOGOS}/narayana-clinic-logo.svg` },
      { id: 'tribit',         name: 'Tribit',          logoUrl: `${SUPABASE_LOGOS}/tribit-logo.svg` },
      { id: 'fourthfrontier', name: 'Fourth Frontier', logoUrl: `${SUPABASE_LOGOS}/fourth-frontier-logo.svg` },
    ],
  },
]

/** All partners flattened — used by the marquee */
export const ALL_PARTNERS: Partner[] = PARTNER_CATEGORIES.flatMap((c) => c.partners)

export const WHY_US: WhyUsItem[] = [
  {
    id: 'audience',
    title: 'High-Intent Audience',
    body: 'Active buyers who spend on fitness gear, nutrition, and recovery every single week. No passive scrollers — these are people who take their health seriously.',
    badges: ['22–35 yr urban professionals', 'Equal gender ratio'],
  },
  {
    id: 'creators',
    title: 'Pro Creator Community',
    body: "We nurture an ecosystem of UGC fitness content creators who are regulars at our runs — producing authentic content that money can't manufacture.",
    badges: ['50+ UGC creators', 'Organic reach'],
  },
  {
    id: 'irl',
    title: 'Real-World Brand Moments',
    body: "Among the only social run clubs in India running three times a week across formats — beginner, intermediate, and advanced. Your brand shows up at every single one.",
    badges: ['3 runs per week', 'All runner levels'],
  },
  {
    id: 'women',
    title: 'Women-Only Sub-Community',
    body: 'A dedicated run & lifestyle club led by women, for women. Reach a highly engaged, underserved demographic at the intersection of fitness and lifestyle.',
    brandLabel: 'Stride Like Women',
  },
]

export const WHATSAPP_LINK = 'https://wa.me/918368877289?text=Hi%20Stride%20Run%20Club!%20I%20am%20interested%20in%20exploring%20a%20brand%20partnership.%20Please%20share%20more%20details.'
