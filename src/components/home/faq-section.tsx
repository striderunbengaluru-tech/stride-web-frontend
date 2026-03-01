import { InteractiveAccordion, type AccordionItem } from '@/components/ui/interactive-accordion';
import faqData from '@/content/faq.json';

const FAQ_ITEMS: AccordionItem[] = faqData;

export default function FaqSection() {
  return (
    <section className='container mx-auto px-6 py-12 md:py-20'>
      <div className='max-w-4xl mx-auto'>

        {/* Section heading */}
        <div className='mb-8 md:mb-12'>
          <p className='text-stride-yellow-accent text-xs font-medium tracking-widest uppercase mb-4 font-roboto'>
            Got questions?
          </p>
          <h2 className='font-libre text-4xl md:text-5xl font-bold text-copy-white mb-4 leading-tight'>
            Everything you need to{' '}
            <span className='text-stride-yellow-accent'>know</span>
          </h2>
          <p className='text-copy-white/60 text-base md:text-lg max-w-xl font-roboto'>
            Before lacing up and joining the pack — here are answers to our most common questions.
          </p>
        </div>

        <InteractiveAccordion items={FAQ_ITEMS} defaultOpenId='who-can-join' />
      </div>
    </section>
  );
}
