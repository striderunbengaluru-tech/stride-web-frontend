'use client';

import Link from 'next/link';
import { Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { HighlightedText } from '@/components/ui/highlighted-text';
import newsroomData from '@/content/newsroom.json';

type Article = (typeof newsroomData.articles)[number];
type Stat = (typeof newsroomData.stats)[number];

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={article.url}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`Read "${article.title}" on ${article.publication}`}
      className='block h-full group'
    >
      <Card className='h-full hover:border-stride-yellow-accent/50 transition-colors'>
        {/* Article image */}
        <div className='relative w-full aspect-video overflow-hidden rounded-t-xl'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image}
            alt={article.title}
            className='absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
          />
          {/* Publication logo badge */}
          <div className='absolute top-3 left-3 bg-copy-black/70 backdrop-blur-sm rounded-md px-2 py-1.5'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.publicationLogo}
              alt={article.publication}
              className='h-5 w-auto object-contain'
            />
          </div>
        </div>

        <CardContent className='flex flex-col gap-3 p-6 md:p-7'>
          <h3 className='font-libre text-xl md:text-2xl font-bold text-copy-white leading-snug line-clamp-3 group-hover:text-stride-yellow-accent transition-colors'>
            {article.title}
          </h3>

          <p className='text-copy-white/60 text-sm leading-relaxed line-clamp-2 font-roboto flex-1'>
            {article.excerpt}
          </p>

          <div className='flex items-center justify-between pt-2 border-t border-copy-white/10'>
            <span className='text-copy-white/40 text-xs font-roboto'>{article.author}</span>
            <span className='text-copy-white/40 text-xs font-roboto'>{formatDate(article.date)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function SecondaryArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={article.url}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`Read "${article.title}" on ${article.publication}`}
      className='block h-full group'
    >
      <Card className='h-full hover:border-stride-yellow-accent/50 transition-colors'>
        {/* Article image */}
        <div className='relative w-full aspect-video overflow-hidden rounded-t-xl'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image}
            alt={article.title}
            className='absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
          />
          <div className='absolute top-3 left-3 bg-copy-black/70 backdrop-blur-sm rounded-md px-2 py-1.5'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.publicationLogo}
              alt={article.publication}
              className='h-5 w-auto object-contain'
            />
          </div>
        </div>

        <CardContent className='flex flex-col gap-3 p-5'>
          <h3 className='font-libre text-base font-bold text-copy-white leading-snug line-clamp-3 group-hover:text-stride-yellow-accent transition-colors'>
            {article.title}
          </h3>

          <span className='text-copy-white/40 text-xs font-roboto mt-auto pt-2 border-t border-copy-white/10 block'>
            {formatDate(article.date)}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Link
      href={stat.href}
      target={stat.href.startsWith('http') ? '_blank' : undefined}
      rel={stat.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className='block h-full group'
    >
      <Card className='h-full flex flex-col items-center justify-center text-center p-6 hover:border-stride-yellow-accent/50 transition-colors'>
        <p className='font-libre text-4xl md:text-5xl font-bold text-stride-yellow-accent group-hover:scale-105 transition-transform'>
          {stat.value}
        </p>
        <p className='text-copy-white/60 text-xs uppercase tracking-widest mt-2 font-roboto'>
          {stat.label}
        </p>
      </Card>
    </Link>
  );
}

function CommunityQuoteCard() {
  const { text, author, location, authorImage } = newsroomData.communityQuote;
  return (
    <Card className='flex flex-col justify-between gap-4 p-6'>
      <Quote className='size-5 text-stride-yellow-accent/60 shrink-0' />
      <p className='text-copy-white/85 text-base md:text-lg leading-relaxed italic font-libre line-clamp-4 flex-1'>
        &ldquo;{text}&rdquo;
      </p>
      <div className='flex items-center gap-3 pt-3 border-t border-copy-white/10'>
        <div className='size-14 rounded-full overflow-hidden shrink-0 border border-copy-white/20'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={authorImage}
            alt={author}
            className='w-full h-full object-cover'
          />
        </div>
        <div>
          <p className='text-copy-white text-sm font-medium font-roboto leading-tight'>{author}</p>
          <p className='text-copy-white/40 text-xs font-roboto'>{location}</p>
        </div>
      </div>
    </Card>
  );
}

export default function NewsroomSection() {
  const { heading, articles, stats } = newsroomData;
  const featured = articles.find((a) => a.featured);
  const secondary = articles.filter((a) => !a.featured);

  return (
    <section className='container mx-auto px-6 py-12 md:py-20'>
      <div className='max-w-4xl mx-auto'>

        {/* Section heading */}
        <div className='mb-8 md:mb-12'>
          <p className='text-stride-yellow-accent text-xs font-medium tracking-widest uppercase mb-4 font-roboto'>
            {heading.pretitle}
          </p>
          <h2 className='font-libre text-4xl md:text-5xl font-bold text-copy-white mb-4 leading-tight'>
            <HighlightedText text={heading.title} />
          </h2>
          <p className='text-copy-white/60 text-base md:text-lg max-w-xl font-roboto'>
            {heading.subtitle}
          </p>
        </div>

        {/* Bento grid — 1 col mobile, 3 col desktop */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>

          {/* Featured article: full width on mobile, 2/3 on desktop */}
          <div className='md:col-span-2 h-full'>
            {featured && <FeaturedArticleCard article={featured} />}
          </div>

          {/* Stat 1: Instagram — stretches to match featured height */}
          <StatCard stat={stats[0]} />

          {/* Secondary articles */}
          {secondary.map((article) => (
            <SecondaryArticleCard key={article.id} article={article} />
          ))}

          {/* Stat 2: Members */}
          <StatCard stat={stats[1]} />

          {/* Community quote */}
          <CommunityQuoteCard />
        </div>
      </div>
    </section>
  );
}
