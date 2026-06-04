export type OriginalHighlight = {
  label: string
  value: string
}

export type Original = {
  slug: string
  title: string
  tagline: string
  heroLabel: string
  description: string
  longDescription: string
  highlights: OriginalHighlight[]
  quote: string
  quoteAuthor: string
  ctaLabel: string
  ctaHref: string
}

export const ORIGINALS: Record<string, Original> = {
  'lake-hop-project': {
    slug: 'lake-hop-project',
    title: 'The Lake Hop Project',
    tagline: 'Bengaluru, one lake at a time.',
    heroLabel: 'Stride Originals',
    description:
      'We run between Bengaluru\'s most iconic lakes — Agara, Ulsoor, Hebbal — tracing the city\'s blue lungs on foot. What started as an experiment became one of our most-loved formats.',
    longDescription:
      'Bengaluru is a city of lakes. We made it a city of runs. The Lake Hop Project strings together the city\'s most iconic water bodies into one continuous running route — a living, breathing map of everything we love about Bengaluru. You earn each lake one kilometre at a time.',
    highlights: [
      { label: 'Lakes per run', value: '2–3' },
      { label: 'Distance', value: '8–12 km' },
      { label: 'Frequency', value: 'Monthly' },
    ],
    quote: 'We experimented with formats, near pools, inside gyms, at bakeries, through tech parks, and across neighbourhood streets.',
    quoteAuthor: 'Stride Run Club',
    ctaLabel: 'Run the next one',
    ctaHref: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },

  'stride-like-a-woman': {
    slug: 'stride-like-a-woman',
    title: 'Stride Like a Woman',
    tagline: 'Led by women. For women.',
    heroLabel: 'Stride Originals',
    description:
      'For many women, the biggest barrier to running isn\'t fitness — it\'s safety. Stride Like a Woman creates a space that\'s intentionally designed for women to run free.',
    longDescription:
      'Stride Like a Woman is our women-only running event series. Led by women, paced by women, powered by the belief that every woman deserves to feel safe on the roads. We\'ve hosted events at Cubbon Park, partnered with wellness brands, and created a community of athletes who show up for each other every single time.',
    highlights: [
      { label: 'Women-only', value: '100%' },
      { label: 'Flagship venue', value: 'Cubbon Park' },
      { label: 'Run on', value: "Women's Day & beyond" },
    ],
    quote: 'For many women, the biggest barrier to running isn\'t fitness. It\'s safety.',
    quoteAuthor: 'Stride Run Club',
    ctaLabel: 'Join the movement',
    ctaHref: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },

  'stride-creator-program': {
    slug: 'stride-creator-program',
    title: 'Stride Creator Program',
    tagline: 'Run. Create. Inspire.',
    heroLabel: 'Stride Originals',
    description:
      'A 4-week bootcamp for athletes who want to start creating content. Build your personal brand while building your fitness — with professional photography, merch, and a community that amplifies you.',
    longDescription:
      'The Stride Creator Program is invite-only. We pick athletes who have a story to tell and teach them to tell it. Over 4 weeks, creators run with us, get professional photography sessions, receive Stride merchandise, and build a following. The best content earns bonus merch and shoutouts on our 51K+ platform.',
    highlights: [
      { label: 'Duration', value: '4 weeks' },
      { label: 'Access', value: 'Invite-only' },
      { label: 'Platform reach', value: '51K+ followers' },
    ],
    quote: 'You didn\'t just run with us. You built this with us.',
    quoteAuthor: 'Stride Run Club',
    ctaLabel: 'Apply for the next cohort',
    ctaHref: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },

  'bakery-hop-run': {
    slug: 'bakery-hop-run',
    title: 'Bakery Hop Run',
    tagline: 'Earn your carbs.',
    heroLabel: 'Stride Originals',
    description:
      'We hop between Bengaluru\'s best bakeries, cafes, and breakfast spots — earning every bite one kilometre at a time. Equal parts run, equal parts indulgence.',
    longDescription:
      'Running doesn\'t have to be serious. The Bakery Hop Run is proof. We plot a route through Bengaluru\'s most beloved neighbourhoods, stop at hand-picked bakeries along the way, and arrive at the final destination with a table waiting. It\'s the only run where carb-loading happens mid-run.',
    highlights: [
      { label: 'Stops per run', value: '3–4 bakeries' },
      { label: 'Distance', value: '5–8 km' },
      { label: 'Vibe', value: 'Easy & social' },
    ],
    quote: 'Good dates start with shared interests.',
    quoteAuthor: 'Stride Run Club',
    ctaLabel: 'Run (and eat) with us',
    ctaHref: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },
}

export const ORIGINALS_LIST = Object.values(ORIGINALS)
