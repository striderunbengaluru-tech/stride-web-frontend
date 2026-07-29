import { InteractiveAccordion, type AccordionItem } from '@/components/ui/interactive-accordion';
import faqData from '@/content/faq.json';

const FAQ_ITEMS: AccordionItem[] = faqData;

export default function FaqSection() {
  return (
    <section className='max-w-6xl mx-auto px-6 pt-6 pb-12 md:pt-10 md:pb-20'>
      <div>

        {/* Section heading */}
        <div className='mb-8 md:mb-12'>
          <p className='text-stride-yellow-accent text-xs font-medium tracking-widest font-mono uppercase mb-4'>
            Got questions?
          </p>
          <h2 className='font-libre text-4xl md:text-5xl font-bold text-copy-white mb-4 leading-tight'>
            Everything you need to{' '}
            <span className='text-stride-yellow-accent'>know</span>
          </h2>
          <p className='text-copy-white/60 text-base md:text-lg max-w-xl font-figtree'>
            Before you lace up and join, find answers to your queries.
          </p>
        </div>

        <InteractiveAccordion items={FAQ_ITEMS} defaultOpenId='who-can-join' />
      </div>
    </section>
  );
}
