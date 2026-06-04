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
    coverUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-pokemon-2.jpg',
    ogImageUrl: 'https://ienotcjldormdxrzukpk.supabase.co/storage/v1/object/public/stride-assets/images/blogs/blog-pokemon-og.jpg',
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
