// pages/index.tsx
import Navbar from '../components/Navbar';
import HeroSection from '@/components/Hero';
import ProjectsSection from '@/components/History';
import TemplateManager from './template/page';
import Footer from '@/components/Footer';
import TopResultsSlider from '@/components/Slider';

const HomePage: React.FC = () => {
  return (
    // Main container with relative positioning and black background
    <div className="min-h-screen w-full relative bg-black font-sans">
      
      {/* Crimson Shadow Background with Top Glow */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255, 80, 120, 0.25), transparent 70%), #000000",
        }}
      />
      {/* Your Content/Components, wrapped to stack above the background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="sticky top-0 z-50">
          <Navbar />
        </div>
        <main className="flex-grow">
          <HeroSection />
          {/* <TemplateManager /> */}
          <TopResultsSlider />
        </main>
        <Footer />
      </div>
      
    </div>
  );
};

export default HomePage;