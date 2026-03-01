import HeroSection from '@/components/home/hero-section';
import NewsroomSection from '@/components/home/newsroom-section';
import MerchSection from '@/components/home/merch-section';
import FaqSection from '@/components/home/faq-section';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <NewsroomSection />
      <MerchSection />
      <FaqSection />
    </main>
  );
}
