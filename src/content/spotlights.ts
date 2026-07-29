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
  /** Slide-specific partnership hook — rendered as an inline link to /partnerships. */
  partnerCta: string;
};

const POSTERS =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/spotlight-posters';
const VIDEOS =
  'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight';

export const SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  {
    slug: 'bakery-hop',
    title: 'Bakery Hop Run',
    subtitle: 'Earn every bite as you run.',
    description:
      'Run through a curated route of local bakeries, with exclusive pit stops serving bites you earn along the way.',
    videoUrl: `${VIDEOS}/spotlight-bakery-hop.mp4`,
    poster: `${POSTERS}/bakery-hop.webp`,
    badge: 'Stride Originals',
    partnerCta: 'Want to see your café in the next edition?',
  },
  {
    slug: 'stride-like-a-woman',
    title: 'Stride Like a Woman',
    subtitle: 'A women-only fitness and lifestyle community.',
    description:
      'Move, grow, and build meaningful friendships in a space designed by women, for women.',
    videoUrl: `${VIDEOS}/spotlight-stride-like-a-woman.mp4`,
    poster: `${POSTERS}/stride-like-a-woman.webp`,
    badge: 'Stride Originals',
    handle: '@stridelikeawoman',
    handleUrl: 'https://www.instagram.com/stridelikeawoman?igsh=aWVkNzVvcm11NXNh',
    partnerCta: 'Want to curate a fun experience with our women-only community?',
  },
  {
    slug: 'run-and-rave',
    title: 'Run and Rave',
    subtitle: 'A workout that ends in a dance party.',
    description:
      'Start your morning with a fitness experience, then hit the dance floor with great music, food, and amazing people.',
    videoUrl: `${VIDEOS}/spotlight-run-and-rave.mp4`,
    poster: `${POSTERS}/spotlight-run-and-rave.webp`,
    badge: 'Stride Originals',
    partnerCta: 'Got a venue or brand made for the after-party?',
  },
  {
    slug: 'lake-hop',
    title: 'The Lake Hop Project',
    subtitle: 'One run. Multiple lakes.',
    description:
      'Hop from lake to lake on a scenic route at sunrise, with routes ranging from 8 to 30 km.',
    // Image-only spotlight — no video.
    poster: `${POSTERS}/spotlight-lake-hop.webp`,
    badge: 'Stride Originals',
    partnerCta: 'Want your brand along on our morning lake runs?',
  },
];
