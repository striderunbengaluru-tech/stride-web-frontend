import HeroSection from '@/components/home/hero-section';
import NewsroomSection from '@/components/home/newsroom-section';
import SpotlightSection from '@/components/home/spotlight-section';
import MerchSection from '@/components/home/merch-section';
import FaqSection from '@/components/home/faq-section';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <NewsroomSection />
      <SpotlightSection />
      <div className='hidden'>
        <MerchSection />
      </div>
      <FaqSection />
    </main>
  );
}
