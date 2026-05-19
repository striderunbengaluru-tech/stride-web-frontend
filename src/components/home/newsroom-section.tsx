'use client';

import { HighlightedText } from '@/components/ui/highlighted-text';
import { FocusRail, type FocusRailItem } from '@/components/ui/focus-rail';
import newsroomData from '@/content/newsroom.json';

export default function NewsroomSection() {
  const { heading, articles } = newsroomData;

  const railItems: FocusRailItem[] = articles.map((a) => ({
    id: a.id,
    title: a.title,
    subtitle: a.excerpt,
    imageSrc: a.image,
    href: a.url,
    publication: a.publication,
    publicationLogo: a.publicationLogo,
    date: a.date,
  }));

  return (
    <section className='max-w-6xl mx-auto px-6 py-12 md:py-20'>
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

      {/* Carousel */}
      <FocusRail items={railItems} loop autoPlay interval={4500} />
    </section>
  );
}
