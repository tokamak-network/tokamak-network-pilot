import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import WhyChooseUs from "./components/WhyChooseUs";
import Features from "./components/Features";
import Integrations from "./components/Integrations";
import HowItWorks from "./components/HowItWorks";
import Stats from "./components/Stats";
import FeaturedProjects from "./components/FeaturedProjects";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <Hero />
      <WhyChooseUs />
      <Features />
      <Integrations />
      <HowItWorks />
      {/* <Stats /> */}
      <FeaturedProjects />
      {/* <Testimonials /> */}
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
