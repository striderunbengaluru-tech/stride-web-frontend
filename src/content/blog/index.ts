import { strideKyroTerritoryRunContent } from './stride-kyro-territory-run'
import { stridePokemonGoRunContent } from './stride-pokemon-go-run'

export type BlogAuthor = {
  name: string
  role: string
  avatarUrl?: string
  instagramUrl?: string
}

export type BlogPost = {
  slug: string
  title: string
  description: string
  publishedAt: string
  author: BlogAuthor
  coverUrl: string
  ogImageUrl?: string
  tags: string[]
  tldr: string[]
  readingTimeMin: number
  content: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'stride-kyro-territory-run',
    title: 'Running Around in Circles (Literally) With the KYRO App',
    description:
      'Stride Run Club ran a team territory battle in Cubbon Park on the KYRO app, where closed loops claim ground and anyone can run over yours to take it.',
    publishedAt: '2026-08-23',
    author: {
      name: 'Kushagra Gupta',
      role: 'Tech Lead, Stride Run Club',
      // The author's own Stride profile photo. Stored without the `?v=` cache
      // buster the profile UI appends, so this always resolves to whatever
      // avatar the account currently has rather than pinning one upload.
      avatarUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/avatars/8bce4cab-ffae-4063-8ded-921cc3fc43c3.webp',
      instagramUrl: 'https://www.instagram.com/kushagra.gupta.15/',
    },
    coverUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-kyro-1.webp',
    ogImageUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-kyro-og.webp',
    tags: ['Community', 'Events', 'Collab', 'Tech'],
    tldr: [
      'Stride Run Club ran a KYRO territory battle on Sunday 16 August, starting and finishing at Shiro Bengaluru with Cubbon Park as the board.',
      'KYRO turns closed running loops into claimed territory. Anyone can cover your ground and close a loop over it to take it from you, and the leaderboard scores both area held and how long you hold it.',
      'Teams of eleven or twelve (Runaway, East India Company, Fast Lions and more) planned zones in advance and gave the biggest loop to their fastest runner.',
      'East India Company won, one day after Independence Day, and Runaway finished fifth. Creator Jeongwoo Ahn felicitated the top individual performers in the men\'s and women\'s categories before the cool-down, dance session and Asian breakfast.',
    ],
    readingTimeMin: 4,
    content: strideKyroTerritoryRunContent,
  },
  {
    slug: 'stride-pokemon-go-run',
    title: 'Stride x Pokémon GO Run',
    description:
      'Stride teamed up with Pokémon GO for a run where the goal was hatching eggs. Free coffee at Starbucks, Pikachu plushies, and a lot of first-time Pokémon trainers.',
    publishedAt: '2026-05-23',
    author: {
      name: 'Sidharth Yadav',
      role: 'Founder, Stride Run Club',
      avatarUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/web-assets/sidharth-yadav-dp.png',
      instagramUrl: 'https://www.instagram.com/the_sid_way/',
    },
    coverUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-pokemon-2.webp',
    ogImageUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-pokemon-og.webp',
    tags: ['Community', 'Events', 'Collab'],
    tldr: [
      'Stride Home Club x Pokémon GO collab run on 23 May — starting and ending at Starbucks.',
      'Athletes downloaded the app, got briefed on egg incubation, then ran 2km or 5km through Cubbon Park to hatch their Pokémon.',
      'Hatched egg = proof of run = entry into a lucky draw for Pikachu plushies.',
      'Four lucky draw winners + one Instagram story winner each took home a Pikachu plushie. Everyone got a free Starbucks beverage.',
    ],
    readingTimeMin: 3,
    content: stridePokemonGoRunContent,
  },
]
