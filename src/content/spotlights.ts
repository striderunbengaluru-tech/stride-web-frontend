export type SpotlightSlide = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** Optional — some spotlights are image-only (no video), shown via `poster`. */
  videoUrl?: string;
  /** WebP shown before play (video uses preload="none"), or the still image for image-only slides. */
  poster: string;
  badge?: 'Stride Originals';
  handle?: string;
  handleUrl?: string;
};

const POSTERS =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/spotlight-posters';
const VIDEOS =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight';

export const SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  {
    slug: 'bakery-hop',
    title: 'Bakery Hop Run',
    subtitle: 'Run between bakeries, earn every bite',
    description:
      "We run between Bengaluru's most-loved bakeries and earn every bite one kilometre at a time. Equal parts run, equal parts indulgence.",
    videoUrl: `${VIDEOS}/spotlight-bakery-hop.mp4`,
    poster: `${POSTERS}/bakery-hop.webp`,
    badge: 'Stride Originals',
  },
  {
    slug: 'stride-like-a-woman',
    title: 'Stride Like a Woman',
    subtitle: 'Women-only run series, led by women',
    description:
      "For many women, the biggest barrier to running isn't fitness, it's safety. We built a run designed for women to move freely, and the turnout said everything.",
    videoUrl: `${VIDEOS}/spotlight-stride-like-a-woman.mp4`,
    poster: `${POSTERS}/stride-like-a-woman.webp`,
    badge: 'Stride Originals',
    handle: '@stridelikeawoman',
    handleUrl: 'https://www.instagram.com/stridelikeawoman?igsh=aWVkNzVvcm11NXNh',
  },
  {
    slug: 'run-and-rave',
    title: 'Run and Rave',
    subtitle: 'A group run, then a fully sober dance party',
    description:
      "A community run followed by a fully sober dance and social, hosted at some of the city's best venues with food, coffee, and plenty of fun. Stride was one of the first run clubs to bring the idea to Bengaluru.",
    videoUrl: `${VIDEOS}/spotlight-run-and-rave.mp4`,
    poster: `${POSTERS}/spotlight-run-and-rave.webp`,
    badge: 'Stride Originals',
  },
  {
    slug: 'lake-hop',
    title: 'The Lake Hop Project',
    subtitle: "Weekday morning runs around the city's lakes",
    description:
      "A weekday morning run series around Bengaluru's lakes. We meet early, run the shoreline together, and are done before the city wakes up.",
    // Image-only spotlight — no video.
    poster: `${POSTERS}/spotlight-lake-hop.webp`,
    badge: 'Stride Originals',
  },
];
