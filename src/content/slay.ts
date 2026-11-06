import { LEAD_STRIDERS, striderImageUrls } from './lead-striders'
import { slayPhoto, type SlayPhoto } from './slay-photos'

/**
 * Copy for `/join-slay`, the Slay Run Club landing page.
 *
 * The words come from the Slay website brief. The page and its markdown twin
 * (`joinSlayMarkdown` in `src/lib/markdown/render.ts`) both read from here, so
 * the two cannot drift apart.
 */

export const SLAY_TAGLINE = 'Slay every move.'

export const SLAY_INTRO =
  'Slay Run Club is a women-only fitness community built to make fitness more social, accessible and empowering.'

export const SLAY_ABOUT = {
  headline: 'More than just a running club.',
  paragraphs: [
    'Stepping out for a run can sometimes feel lonely. Starting your fitness journey can feel intimidating. And sometimes, all you need is someone running beside you, cheering you on or simply making the experience more fun.',
    "That's why Slay exists.",
    'Slay Run Club is a women-only community where you find more than just running buddies. You find people who push you to show up, friends who make every experience worth looking forward to, and a space where you can feel safe, comfortable and completely yourself.',
    "Whether you're a beginner finding your feet or someone who loves exploring new fitness experiences, Slay is a space where you belong.",
    'No judgement, no inhibitions, just women showing up for themselves and each other.',
  ],
  closing: 'Because movement is better together.',
} as const

/**
 * Photo "stickers" that fill the gutters beside the About copy on wide
 * screens, three a side. Purely decorative — the page shows each moment
 * elsewhere with a real caption — so the component renders them with alt="".
 */
export const SLAY_ABOUT_DECOR: { left: SlayPhoto[]; right: SlayPhoto[] } = {
  left: [
    slayPhoto('gym-207', 'A woman running alone on a wet track in the rain'),
    slayPhoto('run-030', 'Two women laughing together before a run'),
    slayPhoto('workshop-185', 'A woman laughing and holding up a decorated glass'),
  ],
  right: [
    slayPhoto('run-139', 'Slay members dancing at the karaoke run'),
    slayPhoto('workshop-177', 'A crowd of Slay members posing together under a tree'),
    slayPhoto('gym-416', 'A woman grinning with two thumbs up after a race'),
  ],
}

export const SLAY_HERO_PHOTOS: SlayPhoto[] = [
  slayPhoto('workshop-128', 'A Slay member laughing with her head thrown back at a Slay Circle workshop'),
  slayPhoto('run-077', 'Slay runners posing in front of a neon "Find your rhythm" sign after the karaoke run'),
  slayPhoto('workshop-108', 'A Slay member beaming at the camera at a Slay Circle workshop'),
  slayPhoto('workshop-162', 'A woman throwing both arms in the air in celebration'),
  slayPhoto('run-121', 'A big group of Slay members making heart hands under neon lights'),
]

/** Three rows for the pinned marquee. Mixed orientations on purpose. */
export const SLAY_MARQUEE_ROWS: SlayPhoto[][] = [
  [
    slayPhoto('run-042', 'A pack of Slay runners jogging down a tree-lined street'),
    slayPhoto('workshop-108', 'A smiling Slay member at a bedazzling workshop'),
    slayPhoto('gym-044', 'A runner high-fiving the crowd at a fitness race'),
    slayPhoto('run-030', 'Two women laughing together before a run'),
    slayPhoto('workshop-121', 'A Slay member beaming while decorating a glass'),
    slayPhoto('gym-130', 'A woman jumping during a fitness race'),
    slayPhoto('run-045', 'Slay runners smiling mid-run'),
    slayPhoto('workshop-153', 'A Slay member smiling at a workshop table'),
    slayPhoto('gym-416', 'A woman grinning with two thumbs up after a race'),
    slayPhoto('run-118', 'A group photo of Slay members under neon lights'),
  ],
  [
    slayPhoto('workshop-163', 'A group of Slay members crouching together and smiling'),
    slayPhoto('gym-035', 'A runner smiling and giving a thumbs up'),
    slayPhoto('run-097', 'Women singing into microphones at the karaoke run'),
    slayPhoto('workshop-000', 'A long candlelit table at the Slay Circle workshop'),
    slayPhoto('gym-122', 'A woman laughing at a fitness event'),
    slayPhoto('run-033', 'Two Slay runners showing off their wristbands'),
    slayPhoto('workshop-087', 'Two women taking a selfie at a workshop'),
    slayPhoto('gym-241', 'A runner smiling as she races indoors'),
    slayPhoto('run-161', 'A Slay runner posing with her hands on her hips'),
    slayPhoto('workshop-189', 'Slay members holding up their goodie bags'),
  ],
  [
    slayPhoto('run-046', 'A runner in a skirt smiling on a city street'),
    slayPhoto('workshop-056', 'A woman smiling at a workshop'),
    slayPhoto('gym-394', 'Two women laughing and clapping at a fitness event'),
    slayPhoto('run-145', 'Two Slay members in fluffy animal hats'),
    slayPhoto('workshop-185', 'A woman laughing and holding up a decorated glass'),
    slayPhoto('gym-210', 'A group of women racing through an indoor arena'),
    slayPhoto('run-175', 'Two Slay runners smiling side by side'),
    slayPhoto('workshop-142', 'A close-up of a smiling Slay member'),
    slayPhoto('gym-420', 'Friends grinning together at a race finish'),
    slayPhoto('run-125', 'A woman belting out a song into a microphone'),
  ],
]

export type SlayExperience = {
  title: string
  description: string
  examples: string[]
  photo: SlayPhoto
}

export const SLAY_EXPERIENCES_HEADLINE = "There's more than one way to Slay."

export const SLAY_EXPERIENCES: SlayExperience[] = [
  {
    title: 'Social Runs',
    description:
      'Easy-paced community runs where women come together to run, make new friends and build a running habit, irrespective of their fitness levels.',
    examples: ['Easy pace', 'All levels', 'New friends'],
    photo: slayPhoto('run-042', 'A pack of Slay runners jogging down a tree-lined street'),
  },
  {
    title: 'Fitness Experiences',
    description:
      'Explore new ways to move, get stronger and have fun through group fitness activities like bungee workouts, Pilates, spinning sessions and more.',
    examples: ['Bungee', 'Pilates', 'Spin'],
    photo: slayPhoto('gym-044', 'A runner high-fiving the crowd at a fitness race'),
  },
  {
    title: 'Curated Workshops',
    description:
      'Creative and interactive experiences that bring women together to unwind, connect and explore something new, including bead bedazzling, clay modelling, make-your-own-perfume workshops and more.',
    examples: ['Bedazzling', 'Clay', 'Perfume'],
    photo: slayPhoto('workshop-012', 'A chalkboard reading "Welcome to Slay Circle" at a bedazzling workshop'),
  },
]

/** Cards for the pinned fan gallery, each captioned with the moment it came from. */
export const SLAY_FAN: { photo: SlayPhoto; caption: string; place: string }[] = [
  { photo: slayPhoto('gym-036', 'A Slay runner smiling and giving a thumbs up'), caption: 'Race day', place: 'HYFIT' },
  { photo: slayPhoto('workshop-160', 'A Slay member smiling with her decorated glass'), caption: 'Slay Circle', place: 'Bedazzling' },
  { photo: slayPhoto('run-077', 'Slay runners in front of a neon sign'), caption: 'Karaoke Run', place: 'Find your rhythm' },
  { photo: slayPhoto('gym-400', 'Two women holding a prize hamper'), caption: 'Podium', place: 'HYFIT' },
  { photo: slayPhoto('workshop-181', 'A woman smiling under a tree holding her glass'), caption: 'Slay Circle', place: 'Bedazzling' },
  { photo: slayPhoto('run-089', 'Women singing together on a sofa'), caption: 'Karaoke Run', place: 'Encore' },
  { photo: slayPhoto('gym-328', 'A woman smiling through a kettlebell lunge'), caption: 'Strength', place: 'HYFIT' },
  { photo: slayPhoto('workshop-186', 'A Slay member smiling in pink'), caption: 'Slay Circle', place: 'Golden hour' },
  { photo: slayPhoto('run-155', 'A woman posing in front of a neon wall'), caption: 'Karaoke Run', place: 'Main character' },
  { photo: slayPhoto('workshop-138', 'A Slay member smiling at the camera'), caption: 'Slay Circle', place: 'New friends' },
]

/** Brief: "Ichita, Jeel and Nirmala" — reused from the Stride team data. */
const SLAY_TEAM_SLUGS = ['ichita-joshi', 'jeel-makwana', 'nirmala-singh'] as const

/** Shown on every card until each person's own Slay title is known. */
export const SLAY_TEAM_ROLE = 'Slay Run Club Lead'

export type SlayTeamMember = {
  slug: string
  name: string
  role: string
  bio: string
  instagramUrl: string
  stravaUrl: string
  /** Every pose from the Stride team page, in display order; the card cycles them. */
  imageUrls: string[]
}

export const SLAY_TEAM: SlayTeamMember[] = SLAY_TEAM_SLUGS.flatMap((slug) => {
  const strider = LEAD_STRIDERS.find((s) => s.slug === slug)
  if (!strider) return []
  return [{
    slug,
    name: strider.name,
    role: SLAY_TEAM_ROLE,
    bio: strider.bio,
    instagramUrl: strider.instagramUrl,
    stravaUrl: strider.stravaUrl,
    imageUrls: striderImageUrls(strider),
  }]
})

export const SLAY_FAQ_HEADLINE = "Questions? We've got you."

const SLAY_FAQ_COPY: { question: string; answer: string }[] = [
  {
    question: 'Do I need to be a runner to join Slay?',
    answer:
      "Not at all! Slay welcomes women of all fitness levels, including complete beginners. You don't need any prior running experience to become part of the community.",
  },
  {
    question: 'Is Slay exclusively for women?',
    answer:
      'Yes! Slay Run Club is a women-only running and fitness community created to give women a comfortable, welcoming and supportive space to move, connect and grow.',
  },
  {
    question: 'Do I need to be fit to participate?',
    answer:
      "Absolutely not. Our experiences cater to different fitness levels. Whether you're just starting your fitness journey or already active, there's something for you.",
  },
  {
    question: 'Are the runs and experiences free?',
    answer:
      'Some community runs may be free, while certain fitness experiences and curated workshops may have a registration fee. Pricing details will be shared with each event announcement.',
  },
  {
    question: 'How often do you organise runs and experiences?',
    answer:
      'We organise 2–3 experiences every month, including social runs, fitness experiences and curated workshops.',
  },
  {
    question: 'Where do the runs and experiences happen?',
    answer:
      'Our activities take place across different locations in Bengaluru. The exact venue and meeting point will be communicated before each event.',
  },
  {
    question: 'Can I come alone?',
    answer:
      "Of course! In fact, we'd love for you to. Many women join Slay without knowing anyone. Our community is a great place to meet new people, make friends and find your fitness buddies.",
  },
  {
    question: 'How do I become a member of Slay Run Club?',
    answer:
      "Apply with the form on this page. Once your application is approved, we'll email you a link to join our WhatsApp community, where you'll get updates about upcoming runs, fitness experiences and workshops, along with details on how to participate.",
  },
]

/** Three moments per question, dealt in as thumbnails when it opens (Made With GSAP 035). */
const SLAY_FAQ_PHOTOS: SlayPhoto[][] = [
  [
    slayPhoto('gym-020', 'A first-time runner finding her stride'),
    slayPhoto('run-064', 'Slay runners jogging past a street sign'),
    slayPhoto('gym-352', 'A runner smiling mid-race'),
  ],
  [
    slayPhoto('run-121', 'A big group of Slay members making heart hands'),
    slayPhoto('workshop-193', 'A crowd of Slay members at a workshop'),
    slayPhoto('run-118', 'A group photo of Slay members under neon lights'),
  ],
  [
    slayPhoto('gym-257', 'A woman on a rowing machine'),
    slayPhoto('gym-341', 'A woman jumping during a fitness race'),
    slayPhoto('run-053', 'Slay runners on an easy-paced run'),
  ],
  [
    slayPhoto('workshop-003', 'A tray of colourful beads for bedazzling'),
    slayPhoto('workshop-010', 'A Slay member smiling at the workshop table'),
    slayPhoto('run-086', 'Women singing on a sofa at the karaoke run'),
  ],
  [
    slayPhoto('workshop-103', 'A long table full of Slay members at a workshop'),
    slayPhoto('run-117', 'Two women holding hands under a neon sign'),
    slayPhoto('gym-232', 'A pack of women running indoors'),
  ],
  [
    slayPhoto('run-063', 'A runner smiling on a Bengaluru street'),
    slayPhoto('workshop-100', 'Slay members seated at a garden cafe'),
    slayPhoto('gym-200', 'A woman laughing at a fitness venue'),
  ],
  [
    slayPhoto('run-032', 'Two new friends grinning before a run'),
    slayPhoto('workshop-087', 'Two women taking a selfie at a workshop'),
    slayPhoto('run-157', 'Three Slay members posing together'),
  ],
  [
    slayPhoto('workshop-181', 'A Slay member smiling under a tree'),
    slayPhoto('run-167', 'A runner giving a thumbs up'),
    slayPhoto('gym-094', 'A volunteer smiling at a race'),
  ],
]

export const SLAY_FAQ: { question: string; answer: string; photos: SlayPhoto[] }[] =
  SLAY_FAQ_COPY.map((entry, i) => ({ ...entry, photos: SLAY_FAQ_PHOTOS[i] ?? [] }))

export const SLAY_JOIN = {
  headline: 'Join the movement.',
  intro:
    "Tell us a little about yourself. Once you're approved, we'll email you the link to the Slay WhatsApp community.",
  photo: slayPhoto('workshop-189', 'Slay members smiling and holding up their goodie bags'),
} as const

/**
 * The Slay palette as hex, for the one consumer that cannot take a CSS token:
 * canvas-confetti paints to a canvas. Mirrors the --color-slay-* tokens.
 */
export const SLAY_CONFETTI_COLORS = ['#E6358F', '#B6F33B', '#FFFFFF']

export const SLAY_UMBRELLA_LINE =
  'Stride Run Club and Slay Run Club are sister communities.'

