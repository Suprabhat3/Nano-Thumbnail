"use client";
import React, { useState } from "react";

type Props = {
  images?: string[];
};

export default function TopResultsSlider({ images }: Props) {
  // Use provided images if valid, otherwise fallback to defaults
  const defaultImages = [
    "/1.png",
    "/2.png",
    "/3.png",
    "/4.png",
    "/5.png",
  ];
  const slides = images && images.length > 0 ? images : defaultImages;

  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const len = slides.length;
  
  // A minimum swipe distance to trigger a slide change
  const minSwipeDistance = 50;

  const prev = () => setIndex((i) => (i - 1 + len) % len);
  const next = () => setIndex((i) => (i + 1) % len);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touchEnd to avoid miscalculation
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;

    if (distance > minSwipeDistance) {
      next(); // Swiped left
    } else if (distance < -minSwipeDistance) {
      prev(); // Swiped right
    }
    
    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    // Section now uses px-0 on all screens to remove any container padding
    <section className="w-full max-w-6xl mx-auto py-6 md:py-8 px-0  mb-10">
      {/* Container for the heading to maintain padding */}
      <div className="px-4 md:px-6 lg:px-8"> 
        <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-center mb-6 md:mb-10">
          Our top results
        </h2>
      </div>

      {/* Touch-enabled container for the slider */}
      <div
        className="relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slider viewport: full-width on mobile, fixed height on desktop */}
        {/* Removed rounded-2xl and shadow-lg for mobile to allow full bleed */}
        <div className="overflow-hidden md:rounded-2xl md:shadow-lg aspect-video md:aspect-auto md:h-[500px] lg:h-[600px]">
          {/* Slides container with smooth transition */}
          <div
            className="flex transition-transform duration-500 ease-out h-full"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((src, i) => (
              <div
                key={i}
                className="min-w-full flex-shrink-0 flex items-center justify-center bg-gray-50"
              >
                {/* Responsive image: fills container without internal padding */}
                <img
                  src={src}
                  alt={`Slide ${i + 1}`}
                  className="w-full h-full object-contain md:object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Previous Button */}
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center shadow-lg transition z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Next Button */}
        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center shadow-lg transition z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Navigation Dots */}
        <div className="flex justify-center gap-2 mt-4 md:mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === index ? "bg-blue-600 scale-125" : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}