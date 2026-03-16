export type Partner = {
  id: string
  name: string
  /** Short tagline shown on the card */
  tagline?: string
  /** Simple Icons CDN URL (white colour variant) or external SVG */
  logoUrl?: string
}

export type PartnerCategory = {
  id: string
  label: string
  description: string
  partners: Partner[]
}

export const PARTNER_CATEGORIES: PartnerCategory[] = [
  {
    id: 'fitness',
    label: 'Fitness & Sports',
    description: 'Performance gear and supplement brands reaching their highest-intent buyers.',
    partners: [
      { id: 'ua', name: 'Under Armour', tagline: 'Performance Apparel', logoUrl: 'https://cdn.simpleicons.org/underarmour/ffffff' },
      { id: 'reebok', name: 'Reebok', tagline: 'Sport & Lifestyle', logoUrl: 'https://cdn.simpleicons.org/reebok/ffffff' },
      { id: 'decathlon', name: 'Decathlon', tagline: 'Sports Equipment', logoUrl: 'https://cdn.simpleicons.org/decathlon/ffffff' },
      { id: 'gnc', name: 'GNC', tagline: 'Sports Nutrition' },
      { id: 'garmin', name: 'Garmin', tagline: 'GPS & Wearables', logoUrl: 'https://cdn.simpleicons.org/garmin/ffffff' },
      { id: 'asics', name: 'ASICS', tagline: 'Running Shoes', logoUrl: 'https://cdn.simpleicons.org/asics/ffffff' },
    ],
  },
  {
    id: 'fnb',
    label: 'Food & Beverage',
    description: 'Fuel the run — before, during, and after. Runners eat, drink, and recover.',
    partners: [
      { id: 'mcdonalds', name: "McDonald's", tagline: 'Quick Service', logoUrl: 'https://cdn.simpleicons.org/mcdonalds/ffffff' },
      { id: 'starbucks', name: 'Starbucks', tagline: 'Coffee & Beverages', logoUrl: 'https://cdn.simpleicons.org/starbucks/ffffff' },
      { id: 'redbull', name: 'Red Bull', tagline: 'Energy Drinks', logoUrl: 'https://cdn.simpleicons.org/redbull/ffffff' },
      { id: 'gatorade', name: 'Gatorade', tagline: 'Sports Hydration' },
      { id: 'subway', name: 'Subway', tagline: 'Healthy Fast Food', logoUrl: 'https://cdn.simpleicons.org/subway/ffffff' },
      { id: 'ragi', name: 'RagiCo', tagline: 'Health Snacks' },
    ],
  },
  {
    id: 'technology',
    label: 'Technology',
    description: 'Tech that powers performance — wearables, apps, and data-driven training.',
    partners: [
      { id: 'fitbit', name: 'Fitbit', tagline: 'Fitness Tracking', logoUrl: 'https://cdn.simpleicons.org/fitbit/ffffff' },
      { id: 'whoop', name: 'WHOOP', tagline: 'Recovery Wearable' },
      { id: 'polar', name: 'Polar', tagline: 'Heart Rate Monitors' },
      { id: 'samsung', name: 'Samsung Health', tagline: 'Health Platform', logoUrl: 'https://cdn.simpleicons.org/samsung/ffffff' },
      { id: 'nrc', name: 'Nike Run Club', tagline: 'Training App', logoUrl: 'https://cdn.simpleicons.org/nike/ffffff' },
      { id: 'strava', name: 'Strava', tagline: 'Athlete Network', logoUrl: 'https://cdn.simpleicons.org/strava/ffffff' },
    ],
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & Wellness',
    description: 'From recovery to daily rituals — brands that complement an active life.',
    partners: [
      { id: 'lululemon', name: 'lululemon', tagline: 'Athletic Wear', logoUrl: 'https://cdn.simpleicons.org/lululemon/ffffff' },
      { id: 'brooks', name: 'Brooks', tagline: 'Running Footwear' },
      { id: 'cult', name: 'Cult.fit', tagline: 'Fitness Studio' },
      { id: 'healthify', name: 'HealthifyMe', tagline: 'Nutrition & Diet' },
      { id: 'newbalance', name: 'New Balance', tagline: 'Running Gear', logoUrl: 'https://cdn.simpleicons.org/newbalance/ffffff' },
      { id: 'onn', name: 'Onn.fit', tagline: 'Sportswear' },
    ],
  },
]

/** All partners flattened — used by the marquee */
export const ALL_PARTNERS: Partner[] = PARTNER_CATEGORIES.flatMap((c) => c.partners)

export const STATS = [
  { value: '2,000+', label: 'Active Members' },
  { value: '50+', label: 'Events Hosted' },
  { value: '15+', label: 'Brand Partners' },
  { value: '95%', label: 'Event Attendance' },
]

export const WHY_US = [
  {
    id: 'audience',
    title: 'High-Intent Audience',
    body: 'Our members are 25–45 year-old urban professionals who spend on fitness gear, nutrition, and recovery every single week. No passive scrollers — these are active buyers.',
  },
  {
    id: 'irl',
    title: 'Real-World Brand Moments',
    body: "Weekly group runs, monthly night runs, quarterly races. Your brand shows up where it matters — in the flesh, at the finish line, post-run when everyone's glowing.",
  },
  {
    id: 'trust',
    title: 'Community-First Trust',
    body: "Stride recommendations carry weight. When we back a brand, our community listens. This isn't an ad slot — it's a genuine endorsement from people who run together.",
  },
  {
    id: 'reach',
    title: 'Multi-Channel Reach',
    body: "Instagram stories, WhatsApp communities, in-run mentions, and event presence — one partnership spans every touchpoint in a runner's daily life.",
  },
]

export const WHATSAPP_LINK = 'https://wa.me/919560602019?text=Hi%20Stride%2C%20I%27m%20interested%20in%20a%20brand%20partnership'
