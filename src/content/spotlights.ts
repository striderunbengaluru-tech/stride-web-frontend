export type SpotlightSlide = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  videoUrl: string;
  badge?: 'Stride Originals';
  handle?: string;
  handleUrl?: string;
};

export const SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  {
    slug: 'stride-like-a-woman',
    title: 'Stride Like a Woman',
    subtitle: 'Women-only run series, led by women',
    description:
      "For many women, the biggest barrier to running isn't fitness — it's safety. We built a space intentionally designed for women to run free, and something magical happened.",
    videoUrl:
      'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight/spotlight-stride-like-a-woman.mp4',
    badge: 'Stride Originals',
    handle: '@stridelikeawoman',
    handleUrl: 'https://www.instagram.com/stridelikeawoman?igsh=aWVkNzVvcm11NXNh',
  },
  {
    slug: 'bakery-hop',
    title: 'The Bakery Hop',
    subtitle: 'Miles + muffins — earn every bite',
    description:
      "We hop between Bengaluru's most beloved bakeries — earning every bite one kilometre at a time. Equal parts run, equal parts indulgence, 100% worth it.",
    videoUrl:
      'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight/spotlight-bakery-hop.mp4',
    badge: 'Stride Originals',
    handle: '@stride_runclub_bengaluru',
    handleUrl: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },
  {
    slug: 'mothers-day',
    title: "Mother's Day Run",
    subtitle: 'Running with the women who shaped us',
    description:
      "We brought our mothers, sisters, and daughters to the streets of Bengaluru. Some ran their first kilometre ever. Every single one of them crossed the finish line.",
    videoUrl:
      'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight/spotlight-mothers-day.mp4',
    badge: 'Stride Originals',
    handle: '@stride_runclub_bengaluru',
    handleUrl: 'https://www.instagram.com/stride_runclub_bengaluru/',
  },
  {
    slug: 'vagisha',
    title: 'Vagisha',
    subtitle: 'Community voice',
    description:
      '"Running used to feel like a chore — something I did alone with headphones in. Stride changed that completely. Now Sunday mornings are something I actually look forward to."',
    videoUrl:
      'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/videos/spotlight/spotlight-vagisha.mp4',
    handle: '@vagisha._',
    handleUrl: 'https://www.instagram.com/vagisha._?igsh=MThod3RxcWVldnd4MA==',
  },
];
