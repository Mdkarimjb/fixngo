import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';

interface Review {
  quote: string;
  name: string;
  city: string;
}

const REVIEWS: Review[] = [
  {
    quote:
      'Technician arrived within an hour and fixed my AC cooling issue quickly. Very professional and reasonably priced.',
    name: 'Rajesh K.',
    city: 'Guntur',
  },
  {
    quote:
      'Booked a deep cleaning — the team was thorough and my home feels brand new. Highly recommend FixNGo.',
    name: 'Sneha Reddy',
    city: 'Vijayawada',
  },
  {
    quote:
      'Transparent pricing with no hidden costs. The technicians are knowledgeable and polite. Will use again.',
    name: 'Priya M.',
    city: 'Guntur',
  },
  {
    quote:
      'Fast response for an emergency repair. They diagnosed the issue and fixed it the same day. Great job!',
    name: 'Venkat S.',
    city: 'Guntur',
  },
];

/** Auto-advancing testimonial carousel styled with FixNGo design tokens. */
export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = REVIEWS.length;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [paused, count]);

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div
      className="relative mx-auto mt-10 max-w-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-3xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {REVIEWS.map((r) => (
            <figure
              key={r.name + r.quote}
              className="w-full shrink-0 bg-white px-8 py-10 text-center ring-1 ring-gray-100"
            >
              <Quote className="mx-auto h-8 w-8 text-primary/30" />
              <div className="mt-3 flex justify-center gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 text-lg text-gray-700">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-5 font-semibold text-gray-900">
                {r.name} · <span className="font-normal text-gray-500">{r.city}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => go(-1)}
        className="absolute -left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-gray-100 transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => go(1)}
        className="absolute -right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-md ring-1 ring-gray-100 transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mt-6 flex justify-center gap-2">
        {REVIEWS.map((r, i) => (
          <button
            key={r.name}
            type="button"
            aria-label={`Go to testimonial ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-2 cursor-pointer rounded-full transition-all ${
              i === index ? 'w-6 bg-primary' : 'w-2 bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
