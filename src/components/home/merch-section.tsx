import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { HighlightedText } from '@/components/ui/highlighted-text';
import merchData from '@/content/merch.json';

type Product = (typeof merchData.products)[number];

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={product.href}
      className='snap-start shrink-0 w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] group'
      aria-label={`Shop ${product.name}`}
    >
      <div className='bg-copy-white/10 backdrop-blur-md border border-copy-white/15 rounded-xl overflow-hidden hover:border-stride-yellow-accent/50 transition-colors h-full flex flex-col'>
        {/* Product image */}
        <div className='relative aspect-[4/5] w-full overflow-hidden'>
          <Image
            src={product.image}
            alt={product.name}
            fill
            className='object-cover transition-transform duration-500 group-hover:scale-105'
          />
        </div>

        {/* Product info */}
        <div className='p-4 flex flex-col gap-1 flex-1'>
          <p className='text-copy-white text-sm font-medium font-roboto line-clamp-1 group-hover:text-stride-yellow-accent transition-colors'>
            {product.name}
          </p>
          <p className='text-stride-yellow-accent font-bold text-base font-libre'>
            {product.price}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function MerchSection() {
  const { heading, products, viewAllHref } = merchData;

  return (
    <section className='py-12 md:py-20'>
      <div className='max-w-6xl mx-auto px-6'>

        {/* Section heading */}
        <div className='max-w-6xl mx-auto mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4'>
          <div>
            <p className='text-stride-yellow-accent text-xs font-medium tracking-widest uppercase mb-4 font-roboto'>
              {heading.pretitle}
            </p>
            <h2 className='font-libre text-4xl md:text-5xl font-bold text-copy-white mb-3 leading-tight'>
              <HighlightedText text={heading.title} />
            </h2>
            <p className='text-copy-white/60 text-base font-roboto max-w-md'>
              {heading.subtitle}
            </p>
          </div>

          {/* View all — visible on md+ alongside heading */}
          <Link
            href={viewAllHref}
            className='hidden sm:inline-flex items-center gap-2 shrink-0 border border-copy-white/40 text-copy-white font-semibold px-6 py-3 rounded-md hover:bg-copy-white/10 transition-colors font-roboto text-sm'
          >
            View all merch
            <ArrowRight className='size-4' />
          </Link>
        </div>

        {/* Carousel — bleeds to screen edges on mobile via negative margin */}
        <div className='max-w-6xl mx-auto'>
          <div className='flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0'>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>

        {/* View all — mobile only, below carousel */}
        <div className='max-w-6xl mx-auto mt-8 flex justify-center sm:hidden'>
          <Link
            href={viewAllHref}
            className='inline-flex items-center gap-2 bg-stride-yellow-accent text-copy-black font-bold px-8 py-3 rounded-md hover:opacity-90 transition-opacity font-roboto text-sm'
          >
            View all merch
            <ArrowRight className='size-4' />
          </Link>
        </div>

      </div>
    </section>
  );
}
